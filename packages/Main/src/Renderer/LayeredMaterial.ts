import * as THREE from 'three';
import TileVS from 'Renderer/Shader/TileVS.glsl';
import TileFS from 'Renderer/Shader/TileFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import Capabilities from 'Core/System/Capabilities';
import RenderMode from 'Renderer/RenderMode';
import { RasterTile, RasterElevationTile, RasterColorTile } from './RasterTile';
import { drawMap } from './WebGLComposer';
import { RenderTargetCache } from './RenderTargetCache';

const identityOffsetScale = new THREE.Vector4(0.0, 0.0, 1.0, 1.0);

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

const samplersElevationCount = 1;

export function getMaxColorSamplerUnitsCount(): number {
    const maxSamplerUnitsCount = Capabilities.getMaxTextureUnitsCount();
    return maxSamplerUnitsCount - samplersElevationCount;
}

export const colorLayerEffects = {
    noEffect: 0,
    removeLightColor: 1,
    removeWhiteColor: 2,
    customEffect: 3,
} as const;

/** GPU struct for color layers */
interface StructColorLayer {
    textureOffset: number;
    crs: number;
    opacity: number;
    effect_parameter: number;
    effect_type: number;
    transparent: boolean;
}

/** GPU struct for elevation layers */
interface StructElevationLayer {
    scale: number;
    bias: number;
    mode: number;
    zmin: number;
    zmax: number;
}

/** Default GPU struct values for initialization QoL */
const defaultStructLayers: Readonly<{
    color: StructColorLayer,
    elevation: StructElevationLayer
}> = {
    color: {
        textureOffset: 0,
        crs: 0,
        opacity: 0,
        effect_parameter: 0,
        effect_type: colorLayerEffects.noEffect,
        transparent: false,
    },
    elevation: {
        scale: 0,
        bias: 0,
        mode: 0,
        zmin: 0,
        zmax: 0,
    },
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
    uniforms: { [name: string]: THREE.IUniform },
    tiles: RasterTile[],
    renderer: THREE.WebGLRenderer,
    renderTargetCache: RenderTargetCache | undefined,
    extent: Extent) {
    if (tiles.find(tile => tile.textures.length == 0)) {
        return;
    }

    const textureSetId = extent.toString();

    let renderTarget = renderTargetCache?.get(textureSetId);

    if (!renderTarget) {
        if (tiles.length == 0) {
            return;
        }

        renderTarget = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: false });

        drawMap(renderTarget, tiles, renderer, extent);

        renderTargetCache?.set(textureSetId, renderTarget);

        renderTarget.texture.userData = { textureSetId };
    } else {
        drawMap(renderTarget, tiles, renderer, extent);
    }

    uniforms.colorOffsetScales.value = identityOffsetScale;
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
    outlineColors: THREE.Color[];

    // Elevation layers
    elevationLayer: StructElevationLayer;
    displacementMap: THREE.DataTexture | null;
    elevationOffsetScales: Array<THREE.Vector4>;

    // Color layers
    map: THREE.DataTexture | null;
    colorOffsetScales: THREE.Vector4;
}

let nbSamplers: [number, number] | undefined;
const fragmentShader: string[] = [];

/** Replacing the default uniforms dynamic type with our own static map. */
export interface LayeredMaterialParameters extends THREE.ShaderMaterialParameters {
    uniforms?: MappedUniforms<LayeredMaterialRawUniforms>;
}

type DefineMapping<Prefix extends string, Mapping extends Record<string, unknown>> = {
    [Name in Extract<keyof Mapping, string> as `${Prefix}_${Name}`]: Mapping[Name]
};

/** Fills in a Partial object's field and narrows the type accordingly. */
function fillInProp<
    Obj extends Partial<Record<PropertyKey, unknown>>,
    Name extends keyof Obj,
    Value extends Obj[Name],
>(
    obj: Obj,
    name: Name,
    value: Value,
): asserts obj is Obj & { [P in Name]: Value } {
    if (obj[name] === undefined) {
        (obj as Record<Name, Value>)[name] = value;
    }
}

type ElevationModeDefines = DefineMapping<'ELEVATION', typeof ELEVATION_MODES>;
type RenderModeDefines = DefineMapping<'MODE', typeof RenderMode.MODES>;
type LayeredMaterialDefines = {
    NUM_VS_TEXTURES: number;
    NUM_FS_TEXTURES: number;
    NUM_CRS: number;
    DEBUG: number;
    MODE: number;
} & ElevationModeDefines
    & RenderModeDefines;

/**
 * Initialiszes elevation and render mode defines and narrows the type
 * accordingly.
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
        const lambertUniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.lambert.uniforms);
        const shaderMaterialParams: THREE.ShaderMaterialParameters = { ...options };
        shaderMaterialParams.uniforms = shaderMaterialParams.uniforms ?? {};
        Object.assign(shaderMaterialParams.uniforms, lambertUniforms);
        super(shaderMaterialParams);
        if (__DEBUG__) { this.name = 'LayeredMaterial'; }

        nbSamplers ??= [samplersElevationCount, getMaxColorSamplerUnitsCount()];

        const defines: Partial<typeof this.defines> = {};

        fillInProp(defines, 'NUM_VS_TEXTURES', nbSamplers[0]);
        fillInProp(defines, 'NUM_FS_TEXTURES', nbSamplers[1]);
        fillInProp(defines, 'NUM_CRS', crsCount);

        initModeDefines(defines);
        fillInProp(defines, 'MODE', RenderMode.MODES.FINAL);

        fillInProp(defines, 'DEBUG', +__DEBUG__);

        if (__DEBUG__) {
            const outlineColors = [new THREE.Color(1.0, 0.0, 0.0)];
            if (crsCount > 1) {
                outlineColors.push(new THREE.Color(1.0, 0.5, 0.0));
            }

            this.initUniforms({
                showOutline: true,
                outlineWidth: 0.008,
                outlineColors,
            });
        }

        this.defines = defines;
        this.lights = true;

        this.fog = true; // receive the fog defined on the scene, if any

        this.vertexShader = TileVS;
        // three loop unrolling of ShaderMaterial only supports integer bounds,
        // see https://github.com/mrdoob/three.js/issues/28020
        fragmentShader[crsCount] ??= ShaderUtils.unrollLoops(TileFS, defines);
        this.fragmentShader = fragmentShader[crsCount];

        this.initUniforms({
            // Color uniforms
            diffuse: new THREE.Color(0.04, 0.23, 0.35),
            opacity: this.opacity,

            // Lighting uniforms
            lightingEnabled: false,
            lightPosition: new THREE.Vector3(-0.5, 0.0, 1.0),

            // Misc properties
            fogNear: 1,
            fogFar: 1000,
            fogColor: new THREE.Color(0.76, 0.85, 1.0),
            fogDensity: 0.00025,
            overlayAlpha: 0,
            overlayColor: new THREE.Color(1.0, 0.3, 0.0),
            objectId: 0,

            geoidHeight: 0.0,

            // > 0 produces gaps,
            // < 0 causes oversampling of textures
            // = 0 causes sampling artefacts due to bad estimation of texture-uv
            // gradients
            // best is a small negative number
            minBorderDistance: -0.01,
        });

        // LayeredMaterialLayers
        this.colorTiles = [];
        this.colorTileIds = [];
        this.layersNeedUpdate = false;

        // elevation/color layer uniforms, to be updated using updateUniforms()
        this.initUniforms({
            elevationLayer: defaultStructLayers.elevation,
            displacementMap: null,
            elevationOffsetScales: identityOffsetScale,
            map: null,
            colorOffsetScales: identityOffsetScale,
            colorTextureCount: 0,
        });

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

        // setTimeout(() => console.log(this), 2);
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

    public getLayerUniforms<Type extends 'color' | 'elevation'>(type: Type):
        MappedUniforms<{
            layers: Array<Type extends 'color'
                ? StructColorLayer
                : StructElevationLayer>,
            textures: Array<THREE.Texture>,
            offsetScales: Array<THREE.Vector4>,
            textureCount: number,
        }> {
        return {
            layers: this.uniforms[`${type}Layers`],
            textures: type == 'color' ? this.uniforms.map : this.uniforms.dislacementMap,
            offsetScales: this.uniforms[`${type}OffsetScales`],
            textureCount: this.uniforms[`${type}TextureCount`],
        };
    }

    public updateLayersUniforms(renderer: THREE.WebGLRenderer, extent: Extent): void {
        const colorlayers = this.colorTiles
            .filter(rt => rt.visible && rt.opacity > 0);
        colorlayers.sort((a, b) =>
            this.colorTileIds.indexOf(a.id) - this.colorTileIds.indexOf(b.id),
        );

        updateLayersUniforms(this.uniforms, colorlayers, renderer, this.renderTargetCache, extent);

        const { displacementMap } = this.uniforms;

        if (this.elevationTile?.level > 0) {
            const { uniforms, elevationTile } = this;
            displacementMap.value = elevationTile.textures[0];
            uniforms.elevationOffsetScales.value = elevationTile.offsetScales[0];
            uniforms.elevationLayer.value = elevationTile;
        }

        this.layersNeedUpdate = false;
    }

    /**
     * Track usage of current render targets for deferred disposal.
     * Should be called every time this material is rendered.
     */
    public markAsRendered(): void {
        if (!this.renderTargetCache) {
            throw new Error('renderTargetCache is not initialized');
        }

        const colorTextures = this.getUniform('colorTextures');
        if (colorTextures?.userData?.textureSetId) {
            this.renderTargetCache.markAsUsed(colorTextures.userData.textureSetId);
        }

        const elevationTextures = this.getUniform('elevationTextures');
        if (elevationTextures?.userData?.textureSetId) {
            this.renderTargetCache.markAsUsed(elevationTextures.userData.textureSetId);
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
