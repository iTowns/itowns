import * as THREE from 'three';
import TileVS from './Shader/TileVS.glsl';
import TileFS from './Shader/TileFS.glsl';
import ShaderUtils from './Shader/ShaderUtils';
import Capabilities from '../Core/System/Capabilities';
import RenderMode from './RenderMode';
import LayeredMaterialLayer from './LayeredMaterialLayer';

const identityOffsetScale = new THREE.Vector4(0.0, 0.0, 1.0, 1.0);

// from three.js packDepthToRGBA
const UnpackDownscale = 255 / 256; // 0..1 -> fraction (excluding 1)
export function unpack1K(color, factor) {
    var bitSh = new THREE.Vector4(
        UnpackDownscale / (256.0 * 256.0 * 256.0),
        UnpackDownscale / (256.0 * 256.0),
        UnpackDownscale / 256.0,
        UnpackDownscale);
    return factor ? bitSh.dot(color) * factor : bitSh.dot(color);
}

export const CRS_DEFINES = [
    ['WGS84', 'WGS84G', 'TMS', 'EPSG:3946', 'EPSG:4326', 'WMTS:WGS84G'],
    ['PM', 'WMTS:PM'],
];

// Max sampler color count to LayeredMaterial
// Because there's a statement limitation to unroll, in getColorAtIdUv method
const maxSamplersColorCount = 15;
const samplersElevationCount = 1;

export function getMaxColorSamplerUnitsCount() {
    const maxSamplerUnitsCount = Capabilities.getMaxTextureUnitsCount();
    return Math.min(maxSamplerUnitsCount - samplersElevationCount, maxSamplersColorCount);
}

function updateUniforms(material, fragmentShader) {
    const layerIds = fragmentShader ? material.colorLayerIds : material.elevationLayerIds;
    if (!layerIds.some(layerId => material.layers[layerId] && material.layers[layerId].needsUpdate)) {
        return;
    }

    // prepare convenient access to elevation or color uniforms
    const u = material.uniforms;
    const layers = (fragmentShader ? u.colorLayers : u.elevationLayers).value;
    const textures = (fragmentShader ? u.colorTextures : u.elevationTextures).value;
    const offsetScales = (fragmentShader ? u.colorOffsetScales : u.elevationOffsetScales).value;
    const textureCount = fragmentShader ? u.colorTextureCount : u.elevationTextureCount;

    // flatten the 2d array [i,j] -> layers[_layerIds[i]].textures[j]
    const max = material.defines[fragmentShader ? 'NUM_FS_TEXTURES' : 'NUM_VS_TEXTURES'];
    let count = 0;
    for (const layerId of layerIds) {
        const layer = material.layers[layerId];
        if (layer && layer.visible && layer.opacity > 0) {
            layer.textureOffset = count;
            for (let i = 0, il = layer.textures.length; i < il; ++i) {
                if (count < max) {
                    offsetScales[count] = layer.offsetScales[i];
                    textures[count] = layer.textures[i];
                    layers[count] = layer;
                }
                count++;
            }
            // layer.needsUpdate = false;
        }
    }
    if (count > max) {
        console.warn(`LayeredMaterial: Not enough texture units (${max} < ${count}), excess textures have been discarded.`);
    }
    textureCount.value = count;
    material.uniformsNeedUpdate = true;
}

function setDefineMapping(object, PROPERTY, mapping) {
    Object.keys(mapping).forEach((key) => {
        object.defines[`${PROPERTY}_${key}`] = mapping[key];
    });
}

function setDefineProperty(object, property, PROPERTY, initValue) {
    object.defines[PROPERTY] = initValue;
    Object.defineProperty(object, property, {
        get: () => object.defines[PROPERTY],
        set: (value) => {
            if (object.defines[PROPERTY] != value) {
                object.defines[PROPERTY] = value;
                object.needsUpdate = true;
            }
        },
    });
}

function setUniformProperty(object, property, initValue) {
    object.uniforms[property] = new THREE.Uniform(initValue);
    Object.defineProperty(object, property, {
        get: () => object.uniforms[property].value,
        set: (value) => {
            if (object.uniforms[property].value != value) {
                object.uniforms[property].value = value;
                object.uniformsNeedUpdate = true;
            }
        },
    });
}

const ELEVATION_MODES = {
    RGBA: 0,
    COLOR: 1,
    DATA: 2,
};

class LayeredMaterial extends THREE.RawShaderMaterial {
    constructor(options = {}) {
        super({});

        const nbSamplers = [samplersElevationCount, getMaxColorSamplerUnitsCount()];

        this.defines.NUM_VS_TEXTURES = nbSamplers[0];
        this.defines.NUM_FS_TEXTURES = nbSamplers[1];
        this.defines.USE_FOG = 1;
        this.defines.EPSILON = 1e-6;

        for (let i = 0, il = CRS_DEFINES.length; i < il; ++i) {
            this.defines[`CRS_${CRS_DEFINES[i][0]}`] = i;
        }
        this.defines.NUM_CRS = CRS_DEFINES.length;

        setDefineMapping(this, 'ELEVATION', ELEVATION_MODES);
        setDefineMapping(this, 'MODE', RenderMode.MODES);
        setDefineProperty(this, 'mode', 'MODE', RenderMode.MODES.FINAL);

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
            const outlineColors = [
                new THREE.Vector3(1.0, 0.0, 0.0),
                new THREE.Vector3(1.0, 0.5, 0.0),
            ];
            setUniformProperty(this, 'showOutline', true);
            setUniformProperty(this, 'outlineWidth', 0.008);
            setUniformProperty(this, 'outlineColors', outlineColors);
        }

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines.USE_LOGDEPTHBUF = 1;
            this.defines.USE_LOGDEPTHBUF_EXT = 1;
        }

        this.vertexShader = TileVS;
        this.fragmentShader = ShaderUtils.unrollLoops(TileFS, this.defines);

        // Color uniforms
        setUniformProperty(this, 'diffuse', new THREE.Color(0.04, 0.23, 0.35));
        setUniformProperty(this, 'opacity', this.opacity);

        // Lighting uniforms
        setUniformProperty(this, 'lightingEnabled', false);
        setUniformProperty(this, 'lightPosition', new THREE.Vector3(-0.5, 0.0, 1.0));

        // Misc properties
        setUniformProperty(this, 'fogDistance', 1000000000.0);
        setUniformProperty(this, 'fogColor', new THREE.Color(0.76, 0.85, 1.0));
        setUniformProperty(this, 'overlayAlpha', 0);
        setUniformProperty(this, 'overlayColor', new THREE.Color(1.0, 0.3, 0.0));
        setUniformProperty(this, 'objectId', 0);

        // > 0 produces gaps,
        // < 0 causes oversampling of textures
        // = 0 causes sampling artefacts due to bad estimation of texture-uv gradients
        // best is a small negative number
        setUniformProperty(this, 'minBorderDistance', -0.01);

        // LayeredMaterialLayers
        this.layers = {};
        this.elevationLayerIds = [];
        this.colorLayerIds = [];

        // elevation layer uniforms, to be updated using updateUniforms()
        this.uniforms.elevationLayers = new THREE.Uniform(new Array(nbSamplers[0]).fill({}));
        this.uniforms.elevationTextures = new THREE.Uniform(new Array(nbSamplers[0]).fill(null));
        this.uniforms.elevationOffsetScales = new THREE.Uniform(new Array(nbSamplers[0]).fill(identityOffsetScale));
        this.uniforms.elevationTextureCount = new THREE.Uniform(0);

        // color layer uniforms, to be updated using updateUniforms()
        this.uniforms.colorLayers = new THREE.Uniform(new Array(nbSamplers[1]).fill({}));
        this.uniforms.colorTextures = new THREE.Uniform(new Array(nbSamplers[1]).fill(null));
        this.uniforms.colorOffsetScales = new THREE.Uniform(new Array(nbSamplers[1]).fill(identityOffsetScale));
        this.uniforms.colorTextureCount = new THREE.Uniform(0);


        // transitory setup with a single hard-coded elevation layer
        const elevation = {
            id: 'elevation',
            coords: [{ crs: () => 'WGS84' }],
            scale: 1,
            bias: 0,
            mode: ELEVATION_MODES.DATA,
            zmin: 0,
            zmax: Infinity,
        };
        const pop = (property) => {
            const value = options[property];
            // so that setValues does not complain
            if (value !== undefined) {
                delete options[property];
            }
            return value;
        };
        if (pop('useRgbaTextureElevation')) {
            elevation.mode = ELEVATION_MODES.RGBA;
            elevation.zmax = 5000;
            throw new Error('Restore this feature');
        } else if (pop('useColorTextureElevation')) {
            elevation.mode = ELEVATION_MODES.COLOR;
            const zmin = pop('colorTextureElevationMinZ');
            const zmax = pop('colorTextureElevationMaxZ');
            elevation.scale = zmax - zmin;
            elevation.bias = zmin;
        }
        this.elevationLayer = this.addLayer(elevation);
        this.elevationLayerIds[0] = elevation.id;

        this.setValues(options);
    }

    updateUniforms() {
        updateUniforms(this, false);
        updateUniforms(this, true);
    }

    dispose() {
        this.dispatchEvent({ type: 'dispose' });
        Object.keys(this.layers).forEach(id => this.layers[id].dispose(false));
        this.layers = {};
        this.updateUniforms(); // do we care ?
    }

    // TODO: rename to setColorLayerIds and add setElevationLayerIds ?
    setSequence(sequenceLayer) {
        this.colorLayerIds = sequenceLayer;
        updateUniforms(this, true); // all color layers
    }

    removeLayer(layerId) {
        const layer = this.layers[layerId];
        if (layer) {
            layer.dispose();
            delete this.layers[layerId];
        }
    }

    addLayer(layer) {
        if (layer.id in this.layers) {
            console.warn('The "{layer.id}" layer was already present in the material, overwritting.');
        }
        const lml = new LayeredMaterialLayer(this, layer);
        this.layers[layer.id] = lml;
        return lml;
    }

    getLayer(layerId) {
        return this.layers[layerId];
    }

    // TODO: deprecate
    getElevationLayer() {
        return this.elevationLayer;
    }
}

export default LayeredMaterial;
