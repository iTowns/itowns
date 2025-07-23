import * as THREE from 'three';
import TileVS from 'Renderer/Shader/TileVS.glsl';
import TileFS from 'Renderer/Shader/TileFS.glsl';
import ShaderUtils from 'Renderer/Shader/ShaderUtils';
import Capabilities from 'Core/System/Capabilities';
import RenderMode from 'Renderer/RenderMode';
import { RasterTile, RasterElevationTile, RasterColorTile } from './RasterTile';
import { makeDataArrayTexture } from './WebGLComposer';

const identityOffsetScale = new THREE.Vector4(0.0, 0.0, 1.0, 1.0);
const defaultTex = new THREE.Texture();

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

const textureArraysCache = new Map<string, THREE.DataArrayTexture>();
const TEXTURE_ARRAY_CACHE_CAPACITY = 200;

/**
 * Updates the uniforms for layered textures,
 * including populating the DataArrayTexture
 * with content from individual 2D textures on the GPU.
 *
 * @param uniforms - The uniforms object for your material.
 * @param tiles - An array of RasterTile objects, each containing textures.
 * @param max - The maximum number of layers for the DataArrayTexture.
 */
function updateLayersUniforms<Type extends 'c' | 'e'>(
    uniforms: { [name: string]: THREE.IUniform },
    tiles: RasterTile[],
    max: number,
    type: Type,
) {
    // Aliases for readability
    const uLayers = uniforms.layers.value;
    const uTextures = uniforms.textures;
    const uOffsetScales = uniforms.offsetScales.value;
    const uTextureCount = uniforms.textureCount;

    // Flatten the 2d array: [i, j] -> layers[_layerIds[i]].textures[j]
    let count = 0;
    let width = 0;
    let height = 0;

    // Determine total count of textures and dimensions
    // (assuming all textures are same size)
    let textureSetId: string = type;
    for (const tile of tiles) {
        // FIXME: RasterElevationTile are always passed to this function alone
        // so this works, but it's really not great even ignoring the dynamic
        // addition of a field.
        // @ts-expect-error: adding field to passed layer
        tile.textureOffset = count;

        for (
            let i = 0;
            i < tile.textures.length && count < max;
            ++i, ++count
        ) {
            const texture = tile.textures[i];
            if (!texture) { continue; }

            textureSetId += `${texture.id}.`;
            uOffsetScales[count] = tile.offsetScales[i];
            uLayers[count] = tile;

            const img = texture.image;
            if (!img || img.width <= 0 || img.height <= 0) {
                console.error('Texture image not loaded or has zero dimensions');
                uTextureCount.value = 0;
                return;
            } else if (count == 0) {
                width = img.width;
                height = img.height;
            } else if (width !== img.width || height !== img.height) {
                console.error('Texture dimensions mismatch');
                uTextureCount.value = 0;
                return;
            }
        }
    }

    if (textureArraysCache.has(textureSetId)) {
        uTextures.value = textureArraysCache.get(textureSetId);
        uTextureCount.value = count;
        const renderer: THREE.WebGLRenderer = view.renderer;
        renderer.initTexture(uTextures.value);
        return;
    }

    if (!makeDataArrayTexture(uTextures, width, height, count, tiles, max)) {
        uTextureCount.value = 0;
        return;
    }

    if (textureArraysCache.size >= TEXTURE_ARRAY_CACHE_CAPACITY) {
        const oldestEntry = textureArraysCache.entries().next().value!;
        oldestEntry[1].dispose();
        textureArraysCache.delete(oldestEntry[0]);
    }
    textureArraysCache.set(textureSetId, uTextures.value);

    if (count > max) {
        console.warn(
            `LayeredMaterial: Not enough texture units (${max} < ${count}),`
            + 'excess textures have been discarded.',
        );
    }
    uTextureCount.value = count;
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
    elevationLayers: Array<StructElevationLayer>;
    elevationTextures: Array<THREE.Texture>;
    elevationOffsetScales: Array<THREE.Vector4>;
    elevationTextureCount: number;

    // Color layers
    colorLayers: Array<StructColorLayer>;
    colorTextures: THREE.DataArrayTexture;
    colorOffsetScales: Array<THREE.Vector4>;
    colorTextureCount: number;
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

    public override defines: LayeredMaterialDefines;

    constructor(options: LayeredMaterialParameters = {}, crsCount: number) {
        super(options);

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
            elevationLayers: new Array(nbSamplers[0])
                .fill(defaultStructLayers.elevation),
            elevationTextures: new Array(nbSamplers[0]).fill(defaultTex),
            elevationOffsetScales: new Array(nbSamplers[0])
                .fill(identityOffsetScale),
            elevationTextureCount: 0,

            colorLayers: new Array(nbSamplers[1])
                .fill(defaultStructLayers.color),
            colorTextures: new THREE.DataArrayTexture(null, 1, 1, 1),
            colorOffsetScales: new Array(nbSamplers[1])
                .fill(identityOffsetScale),
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
            textures: this.uniforms[`${type}Textures`],
            offsetScales: this.uniforms[`${type}OffsetScales`],
            textureCount: this.uniforms[`${type}TextureCount`],
        };
    }

    public updateLayersUniforms(): void {
        const colorlayers = this.colorTiles
            .filter(rt => rt.visible && rt.opacity > 0);
        colorlayers.sort((a, b) =>
            this.colorTileIds.indexOf(a.id) - this.colorTileIds.indexOf(b.id),
        );

        updateLayersUniforms(
            this.getLayerUniforms('color'),
            colorlayers,
            this.defines.NUM_FS_TEXTURES,
            'c',
        );

        if (this.elevationTileId !== undefined && this.getElevationTile()) {
            if (this.elevationTile !== undefined) {
                updateLayersUniforms(
                    this.getLayerUniforms('elevation'),
                    [this.elevationTile],
                    this.defines.NUM_VS_TEXTURES,
                    'e',
                );
            }
        }

        this.layersNeedUpdate = false;
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
            } else {
                this.elevationTileId = undefined;
            }
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
