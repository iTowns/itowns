import * as THREE from 'three';
import { Extent } from '@itowns/geographic';
import TileVS from 'Renderer/Shader/TileVS.glsl';
import TileFS from 'Renderer/Shader/TileFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import RenderMode from 'Renderer/RenderMode';
import { RasterTile, RasterElevationTile, RasterColorTile } from './RasterTile';
import { drawMap } from './WebGLComposer';
import { RenderTargetCache } from './RenderTargetCache';

// from three.js packDepthToRGBA
const UnpackDownscale = 255 / 256; // 0..1 -> fraction (excluding 1)
const bitSh = new THREE.Vector4(
    UnpackDownscale,
    UnpackDownscale / 256.0,
    UnpackDownscale / (256.0 * 256.0),
    UnpackDownscale / (256.0 * 256.0 * 256.0),
);

export function unpack1K(color: THREE.Vector4Like, factor: number): number {
    return factor ? bitSh.dot(color) * factor : bitSh.dot(color);
}

export const colorLayerEffects = {
    noEffect: 0,
    removeLightColor: 1,
    removeWhiteColor: 2,
    customEffect: 3,
} as const;

/** GPU struct for elevation layers */
interface StructElevationLayer {
    scale: number;
    bias: number;
    mode: number;
    zmin: number;
    zmax: number;
}

/** Default GPU struct values for initialization QoL */
const defaultStructElevationLayer: StructElevationLayer = {
    scale: 0,
    bias: 0,
    mode: 0,
    zmin: 0,
    zmax: 0,
};

/**
 * Updates the uniforms for layered textures of a specific type,
 * including populating the DataArrayTexture
 * with content from individual 2D textures on the GPU.
 *
 * @param uniforms - The uniforms object for your material.
 * @param tiles - An array of RasterTile objects, each containing textures.
 * @param max - The maximum number of layers for the DataArrayTexture.
 * @param type - Layer set identifier: 'c' for color, 'e' for elevation.
 * @param renderer - The renderer used to render textures.
 * @param renderTargetCache - Cache for managing render targets.
 */
function updateLayersUniforms(
    uniforms: Record<string, THREE.IUniform>,
    tiles: RasterTile[],
    renderer: THREE.WebGLRenderer,
    renderTargetCache: RenderTargetCache | undefined,
    extent: Extent) {
    if (tiles.length == 0 || tiles.find(tile => tile.textures.length == 0) || !renderTargetCache) {
        return;
    }

    const textureSetId = extent.toString();

    let renderTarget = renderTargetCache.get(textureSetId);

    if (!renderTarget) {
        renderTarget = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: false });
        renderTarget.texture.extent = extent;

        renderTargetCache.set(textureSetId, renderTarget);
    }

    drawMap(renderTarget, tiles, renderer);

    uniforms.mapTransform.value.identity();
    uniforms.map.value = renderTarget.texture;
}

export const ELEVATION_MODES = {
    RGBA: 0,
    COLOR: 1,
    DATA: 2,
} as const;

/**
 * Convenience type that wraps all of the generic type's fields in
 * [THREE.IUniform]s.
 */
type MappedUniforms<Uniforms> = {
    [name in keyof Uniforms]: THREE.IUniform<Uniforms[name]>;
};

/** List of the uniform types required for a LayeredMaterial. */
interface LayeredMaterialRawUniforms {
    // Color
    diffuse: THREE.Color;
    opacity: number;

    // Lighting
    lightingEnabled: boolean;
    lightPosition: THREE.Vector3;

    // Misc
    fogNear: number;
    fogFar: number;
    fogColor: THREE.Color;
    fogDensity: number;
    overlayAlpha: number;
    overlayColor: THREE.Color;
    objectId: number;
    geoidHeight: number;

    // > 0 produces gaps,
    // < 0 causes oversampling of textures
    // = 0 causes sampling artefacts due to bad estimation of texture-uv
    // gradients
    // best is a small negative number
    minBorderDistance: number;

    // Debug
    showOutline: boolean;
    outlineWidth: number;
    outlineColors: THREE.Color;

    // Elevation layers
    elevationLayer: StructElevationLayer;
    displacementMap: THREE.DataTexture | null;
    displacementMapTransform: THREE.Matrix3;

    // Color layers
    map: THREE.DataTexture | null;
    mapTransform: THREE.Matrix3;
}

const fragmentShader: string[] = [];

/** Replacing the default uniforms dynamic type with our own static map. */
export interface LayeredMaterialParameters extends THREE.ShaderMaterialParameters {
    uniforms?: MappedUniforms<LayeredMaterialRawUniforms>;
}

type DefineMapping<Prefix extends string, Mapping extends Record<string, unknown>> = {
    [Name in Extract<keyof Mapping, string> as `${Prefix}_${Name}`]: Mapping[Name]
};

/**
 * Fills in a Partial object's field and narrows the type accordingly.
 * @param obj
 * @param name
 * @param value
 */
function fillInProp<
    Obj extends Partial<Record<PropertyKey, unknown>>,
    Name extends keyof Obj,
    Value extends Obj[Name],
>(
    obj: Obj,
    name: Name,
    value: Value,
): asserts obj is Obj & Record<Name, Value> {
    if (obj[name] === undefined) {
        (obj as Record<Name, Value>)[name] = value;
    }
}

type ElevationModeDefines = DefineMapping<'ELEVATION', typeof ELEVATION_MODES>;
type RenderModeDefines = DefineMapping<'MODE', typeof RenderMode.MODES>;
type LayeredMaterialDefines = {
    USE_MAP: number;
    USE_DISPLACEMENTMAP: number;
    DEBUG: number;
    MODE: number;
} & ElevationModeDefines & RenderModeDefines;

/**
 * Initialiszes elevation and render mode defines and narrows the type
 * accordingly.
 * @param defines
 */
function initModeDefines(
    defines: Partial<LayeredMaterialDefines>,
): asserts defines is Partial<LayeredMaterialDefines> & ElevationModeDefines & RenderModeDefines {
    (Object.keys(ELEVATION_MODES) as (keyof typeof ELEVATION_MODES)[])
        .forEach(key => fillInProp(defines, `ELEVATION_${key}`, ELEVATION_MODES[key]));
    (Object.keys(RenderMode.MODES) as (keyof typeof RenderMode.MODES)[])
        .forEach(key => fillInProp(defines, `MODE_${key}`, RenderMode.MODES[key]));
}

/** Material that handles the overlap of multiple raster tiles. */
export class LayeredMaterial extends THREE.ShaderMaterial {
    private _visible = true;

    public colorTiles: RasterColorTile[];
    public elevationTile: RasterElevationTile | undefined;

    public colorTileIds: string[];
    public elevationTileId: string | undefined;

    public layersNeedUpdate: boolean;

    public renderTargetCache: RenderTargetCache | undefined;

    public override defines: LayeredMaterialDefines;

    constructor(options: LayeredMaterialParameters = {}, crsCount: number) {
        super(options);
        this.name = 'LayeredMaterial';

        const defines: Partial<typeof this.defines> = {};

        fillInProp(defines, 'USE_MAP', 1);
        fillInProp(defines, 'USE_DISPLACEMENTMAP', 1);

        initModeDefines(defines);
        fillInProp(defines, 'MODE', RenderMode.MODES.FINAL);

        fillInProp(defines, 'DEBUG', +__DEBUG__);

        // iTowns-specific uniforms + overrides of lambert defaults.
        const itownsUniforms: Record<string, THREE.IUniform> = {
            lightingEnabled: { value: false },
            lightPosition: { value: new THREE.Vector3(-0.5, 0.0, 1.0) },
            overlayAlpha: { value: 0 },
            overlayColor: { value: new THREE.Color(1.0, 0.3, 0.0) },
            objectId: { value: 0 },
            geoidHeight: { value: 0.0 },
            minBorderDistance: { value: -0.01 },
            elevationLayer: { value: defaultStructElevationLayer },
            diffuse: { value: new THREE.Color(0.04, 0.23, 0.35) },
            opacity: { value: this.opacity },
            fogFar: { value: 1000 },
            fogColor: { value: new THREE.Color(0.76, 0.85, 1.0) },
        };

        if (__DEBUG__) {
            itownsUniforms.showOutline = { value: true };
            itownsUniforms.outlineWidth = { value: 0.008 };
            itownsUniforms.outlineColors = { value: new THREE.Color(1.0, 0.0, 0.0) };
        }

        // Merge Three.js lambert uniforms (fog, map, displacementmap, diffuse,
        // opacity…) with iTowns-specific uniforms.
        // User-provided options.uniforms take final precedence.
        this.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.lambert.uniforms,
            itownsUniforms,
            options.uniforms ?? {},
        ]);

        this.defines = defines;
        this.lights = true;

        this.fog = true; // receive the fog defined on the scene, if any

        this.vertexShader = TileVS;
        // three loop unrolling of ShaderMaterial only supports integer bounds,
        // see https://github.com/mrdoob/three.js/issues/28020
        fragmentShader[crsCount] ??= ShaderUtils.unrollLoops(TileFS, defines);
        this.fragmentShader = fragmentShader[crsCount];

        // LayeredMaterialLayers
        this.colorTiles = [];
        this.colorTileIds = [];
        this.layersNeedUpdate = false;

        // Can't do an ES6 getter/setter here because it would override the
        // Material::visible property with accessors, which is not allowed.
        Object.defineProperty(this, 'visible', {
            // Knowing the visibility of a `LayeredMaterial` is useful. For
            // example in a `GlobeView`, if you zoom in, "parent" tiles seems
            // hidden; in fact, there are not, it is only their material (so
            // `LayeredMaterial`) that is set to not visible.

            // Adding an event when changing this property can be useful to
            // hide others things, like in `TileDebug`, or in later PR to come
            // (#1303 for example).

            // TODO : verify if there is a better mechanism to avoid this event
            get() { return this._visible; },
            set(v) {
                if (this._visible != v) {
                    this._visible = v;
                    this.dispatchEvent({ type: v ? 'shown' : 'hidden' });
                }
            },
        });
    }

    public get mode(): number {
        return this.defines.MODE;
    }

    public set mode(mode: number) {
        if (this.defines.MODE != mode) {
            this.defines.MODE = mode;
            this.needsUpdate = true;
        }
    }

    public getUniform<Name extends keyof LayeredMaterialRawUniforms>(
        name: Name,
    ): LayeredMaterialRawUniforms[Name] | undefined {
        return this.uniforms[name]?.value;
    }

    public setUniform<
        Name extends keyof LayeredMaterialRawUniforms,
        Value extends LayeredMaterialRawUniforms[Name],
    >(name: Name, value: Value): void {
        const uniform = this.uniforms[name];
        if (uniform === undefined) {
            return;
        }
        if (uniform.value !== value) {
            uniform.value = value;
        }
    }

    public initUniforms(uniforms: {
        [Name in keyof LayeredMaterialRawUniforms
        ]?: LayeredMaterialRawUniforms[Name]
    }): void {
        for (const [name, value] of Object.entries(uniforms)) {
            if (this.uniforms[name] === undefined) {
                this.uniforms[name] = { value };
            }
        }
    }

    public setUniforms(uniforms: {
        [Name in keyof LayeredMaterialRawUniforms
        ]?: LayeredMaterialRawUniforms[Name]
    }): void {
        for (const [name, value] of Object.entries(uniforms)) {
            this.setUniform(name as keyof LayeredMaterialRawUniforms, value);
        }
    }

    public updateLayersUniforms(renderer: THREE.WebGLRenderer, extent: Extent): void {
        if (!this.layersNeedUpdate) {
            return;
        } else {
            const colorlayers = this.colorTiles
                .filter(rt => rt.visible && rt.opacity > 0)
                .sort((a, b) =>
                    this.colorTileIds.indexOf(a.id) - this.colorTileIds.indexOf(b.id),
                );

            updateLayersUniforms(this.uniforms,
                colorlayers, renderer, this.renderTargetCache, extent);

            if (this.elevationTile && this.elevationTile.level > 0) {
                const { uniforms, elevationTile } = this;
                uniforms.displacementMap.value = elevationTile.textures[0];
                uniforms.displacementMapTransform.value = elevationTile.mapTransforms[0];
                uniforms.elevationLayer.value = elevationTile;
            }

            this.layersNeedUpdate = false;
        }
    }

    /**
     * Track usage of current render targets for deferred disposal.
     * Should be called every time this material is rendered.
     */
    public markAsRendered(): void {
        if (!this.renderTargetCache) {
            throw new Error('renderTargetCache is not initialized');
        }

        const map = this.uniforms.map.value;
        if (map?.userData?.textureSetId) {
            this.renderTargetCache.markAsUsed(map.userData.textureSetId);
        }

        const displacementMap = this.uniforms.displacementMap.value;
        if (displacementMap?.userData?.textureSetId) {
            this.renderTargetCache.markAsUsed(displacementMap.userData.textureSetId);
        }
    }

    public dispose(): void {
        this.dispatchEvent({ type: 'dispose' });

        this.colorTiles.forEach(l => l.dispose(true));
        this.colorTiles.length = 0;

        this.elevationTile?.dispose(true);

        this.layersNeedUpdate = true;
    }

    public setColorTileIds(ids: string[]): void {
        this.colorTileIds = ids;
        this.layersNeedUpdate = true;
    }

    public setElevationTileId(id: string): void {
        this.elevationTileId = id;
        this.layersNeedUpdate = true;
    }

    public removeTile(tileId: string): void {
        const index = this.colorTiles.findIndex(l => l.id === tileId);
        if (index > -1) {
            this.colorTiles[index].dispose();
            this.colorTiles.splice(index, 1);
            const idSeq = this.colorTileIds.indexOf(tileId);
            if (idSeq > -1) {
                this.colorTileIds.splice(idSeq, 1);
            }
            return;
        }

        if (this.elevationTileId === tileId) {
            this.elevationTile?.dispose();
            this.elevationTileId = undefined;
            this.elevationTile = undefined;
        }
    }

    public addColorTile(rasterTile: RasterColorTile) {
        if (rasterTile.layer.id in this.colorTiles) {
            console.warn(
                'Layer "{layer.id}" already present in material, overwriting.',
            );
        }
        this.colorTiles.push(rasterTile);
    }

    public setElevationTile(rasterTile: RasterElevationTile) {
        const old = this.elevationTile;
        if (old !== undefined) {
            old.dispose();
        }

        this.elevationTile = rasterTile;
    }

    public getColorTile(id: string): RasterColorTile | undefined {
        return this.colorTiles.find(l => l.id === id);
    }

    public getElevationTile(): RasterElevationTile | undefined {
        return this.elevationTile;
    }

    public getTile(id: string): RasterTile | undefined {
        return this.elevationTile?.id === id
            ? this.elevationTile : this.colorTiles.find(l => l.id === id);
    }

    public getTiles(ids: string[]): RasterTile[] {
        // NOTE: this could instead be a mapping with an undefined in place of
        // unfound IDs. Need to identify a use case for it though as it would
        // probably have a performance cost (albeit minor in the grand scheme of
        // things).
        const res: RasterTile[] = this.colorTiles.filter(l => ids.includes(l.id));
        if (this.elevationTile !== undefined && ids.includes(this.elevationTile?.id)) {
            res.push(this.elevationTile);
        }
        return res;
    }
}
