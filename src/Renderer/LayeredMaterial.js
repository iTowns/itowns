/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import TileVS from './Shader/TileVS.glsl';
import TileFS from './Shader/TileFS.glsl';
import PrecisionQualifier from './Shader/Chunk/PrecisionQualifier.glsl';
import ColorLayer from './Shader/Chunk/ColorLayer.glsl';
import ColorLayerPM from './Shader/Chunk/ColorLayerPM.glsl';
import Capabilities from '../Core/System/Capabilities';
import pack from './AtlasBuilder';

export const EMPTY_TEXTURE_ZOOM = -1;

var emptyTexture = new THREE.Texture();
emptyTexture.coords = { zoom: EMPTY_TEXTURE_ZOOM };

var emptyAtlas = new THREE.Texture();
emptyAtlas.coords = [{ zoom: EMPTY_TEXTURE_ZOOM }];

// make sure we never release empty textures
acquireTexture(emptyTexture);
acquireTexture(emptyAtlas);

var vector = new THREE.Vector3(0.0, 0.0, 0.0);
var vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);

export const l_ELEVATION = 0;
export const l_COLOR = 1;

// from three.js packDepthToRGBA
const UnpackDownscale = 255 / 256; // 0..1 -> fraction (excluding 1)
export function unpack1K(color, factor) {
    var bitSh = new THREE.Vector4(
        UnpackDownscale / (256.0 * 256.0 * 256.0),
        UnpackDownscale / (256.0 * 256.0),
        UnpackDownscale / 256.0,
        1.0);
    return bitSh.dot(color) * factor;
}

export function acquireTexture(texture) {
    texture._ownerCount = (texture._ownerCount || 0) + 1;
    return texture;
}

export function releaseTexture(texture) {
    texture._ownerCount--;
    if (__DEBUG__) {
        if (texture._ownerCount < 0) {
            throw new Error('ref counting bug for texture', texture);
        }
    }
    if (texture._ownerCount == 0) {
        texture.dispose();
        texture.image = undefined;
    }
}

// Array not suported in IE
var fillArray = function fillArray(array, remp) {
    for (var i = 0; i < array.length; i++)
        { array[i] = remp; }
};

const LayeredMaterial = function LayeredMaterial(options) {
    THREE.RawShaderMaterial.call(this);

    this.vertexShader = TileVS;

    options = options || { };
    let vsOptions = '';
    if (options.useRgbaTextureElevation) {
        throw new Error('Restore this feature');
    } else if (options.useColorTextureElevation) {
        vsOptions = '\n#define COLOR_TEXTURE_ELEVATION\n';
        vsOptions += `\nconst float _minElevation = ${options.colorTextureElevationMinZ.toFixed(1)};\n`;
        vsOptions += `\nconst float _maxElevation = ${options.colorTextureElevationMaxZ.toFixed(1)};\n`;
    } else {
        // default
        vsOptions = '\n#define DATA_TEXTURE_ELEVATION\n';
    }

    this.vertexShader = PrecisionQualifier + vsOptions + TileVS;

    // handle on textures uniforms
    this.textures = [];
    // handle on textures offsetScale uniforms
    this.offsetScale = [];
    // handle Loaded textures count by layer's type uniforms
    this.loadedTexturesCount = [0, 0];

    // Uniform three js needs no empty array
    // WARNING TODO: prevent empty slot, but it's not the solution
    this.offsetScale[l_COLOR] = {};
    this.offsetScale[l_ELEVATION] = [vector];

    this.textures[l_ELEVATION] = [acquireTexture(emptyTexture)];
    var paramLayers = new Array(8);
    fillArray(paramLayers, vector);

    // Elevation texture
    this.uniforms.dTextures_00 = new THREE.Uniform(this.textures[l_ELEVATION]);

    // Visibility layer
    this.uniforms.visibility = new THREE.Uniform([true, true, true, true, true, true, true, true]);

    // Loaded textures count by layer's type
    this.uniforms.loadedTexturesCount = new THREE.Uniform(this.loadedTexturesCount);

    // Count color layers
    this.uniforms.colorLayersCount = new THREE.Uniform(1);

    // Layer setting
    // visibility | opacity | fx
    this.uniforms.paramLayers = new THREE.Uniform(paramLayers);

    // Elevation texture cropping
    this.uniforms.offsetScale_L00 = new THREE.Uniform(this.offsetScale[l_ELEVATION]);

    // Light position
    this.uniforms.lightPosition = new THREE.Uniform(new THREE.Vector3(-0.5, 0.0, 1.0));

    this.uniforms.distanceFog = new THREE.Uniform(1000000000.0);

    this.uniforms.uuid = new THREE.Uniform(0);

    this.uniforms.selected = new THREE.Uniform(false);

    this.uniforms.lightingEnabled = new THREE.Uniform(false);

    this.colorLayersId = [];
    this.elevationLayersId = [];

    if (Capabilities.isLogDepthBufferSupported()) {
        this.defines = {
            USE_LOGDEPTHBUF: 1,
            USE_LOGDEPTHBUF_EXT: 1,
        };
    } else {
        this.defines = {};
    }

    const atlasTextures = new Array(8);
    for (let i = 0; i < 8; i++) {
        atlasTextures[i] = acquireTexture(emptyAtlas);
    }
    this.uniforms.atlasTextures = new THREE.Uniform(atlasTextures);

    this._updateFragmentShader();
};

LayeredMaterial.prototype = Object.create(THREE.RawShaderMaterial.prototype);
LayeredMaterial.prototype.constructor = LayeredMaterial;

LayeredMaterial.prototype._updateFragmentShader = function _updateFragmentShader() {
    const colorCount = this.colorLayersId.length;

    let header = PrecisionQualifier;
    header += `const int ColorLayersCount = ${Math.max(1, colorCount)};\n`;

    let paramByIndexContent = '';
    // MAX_TEXTURE_COUNT_PER_PM_LAYER = 4, see TileFS
    for (let i = 0; i < 4; i++) {
        paramByIndexContent += `if (index == ${i}) return offsetScale[${i}];\n`;
    }
    paramByIndexContent += 'return vec4(0.0);';

    let offsetScaleUniforms = '';
    let layerColors = '';
    const re = /REPLACE_LAYER_INDEX/g;
    const re2 = /REPLACE_TEXTURE_INDEX/g;
    const re3 = /REPLACE_LAYER_NAME/g;

    // Loop over color layers (defines rendering order of layers)
    for (let i = 0; i < colorCount; i++) {
        if (this.getColorLayerLevelById(this.colorLayersId[i]) != EMPTY_TEXTURE_ZOOM) {
            const usePM = this.uniforms.atlasTextures.value[i].coords[0].crs().indexOf(':PM') >= 0;
            const s = usePM ? ColorLayerPM : ColorLayer;

            layerColors += s.replace(re, i)
                .replace(re2, i)
                .replace(re3, this.colorLayersId[i]);

            offsetScaleUniforms += `uniform vec4 offsetScale_${this.colorLayersId[i]}`;
            if (usePM) {
                offsetScaleUniforms += '[MAX_TEXTURE_COUNT_PER_PM_LAYER]';
            } else {
                offsetScaleUniforms += '[1]';
            }
            offsetScaleUniforms += ';\n';
        }
    }

    this.fragmentShader = header +
        TileFS.replace('REPLACE_COLOR_LAYER', layerColors)
            .replace('REPLACE_PARAM_BY_INDEX', paramByIndexContent)
            .replace('INSERT_OFFSET_SCALE_UNIFORMS', offsetScaleUniforms);

    this.needsUpdate = true;
};

LayeredMaterial.prototype.dispose = function dispose() {
    THREE.Material.prototype.dispose.call(this);

    // note: releasing texture deallocates that associates GL texture (deallocateTexture in three.js)
    // So releasing an in-use texture cause unnecessary cpu/gpu usage but won't cause
    // visible artifacts.
    releaseTexture(this.textures[l_ELEVATION][0]);

    // release texture atlas
    for (const atlas of this.uniforms.atlasTextures.value) {
        releaseTexture(atlas);
    }
    this.uniforms.atlasTextures.value = [];
};

function _swapIndices(array, newIndices) {
    const copy = [...array];
    for (const pair of newIndices) {
        array[pair.new] = copy[pair.old];
    }
}

LayeredMaterial.prototype.setSequence = function setSequence(sequenceLayer) {
    const newIndices = [];

    let offset = 0;
    // assign new index
    for (let l = 0; l < sequenceLayer.length; l++) {
        const layer = sequenceLayer[l];
        const oldIndex = this.indexOfColorLayer(layer);
        if (oldIndex > -1) {
            const newIndex = l - offset;
            newIndices.push({ new: newIndex, old: oldIndex });
        } else {
            offset++;
        }
    }

    // build new arrays
    _swapIndices(this.colorLayersId, newIndices);
    _swapIndices(this.uniforms.paramLayers.value, newIndices);
    _swapIndices(this.uniforms.atlasTextures.value, newIndices);

    this.uniforms.colorLayersCount.value = this.getColorLayersCount();

    this._updateFragmentShader();
};

LayeredMaterial.prototype.removeColorLayer = function removeColorLayer(layerId) {
    const layerIndex = this.indexOfColorLayer(layerId);

    if (layerIndex === -1) {
        return;
    }

    // remove layer
    this.colorLayersId.splice(layerIndex, 1);
    this.uniforms.colorLayersCount.value = this.getColorLayersCount();

    // Remove Layers Parameters
    this.uniforms.paramLayers.value.splice(layerIndex, 1);
    this.uniforms.paramLayers.value.push(vector);

    const atlas = this.uniforms.atlasTextures.value[layerIndex];
    releaseTexture(atlas);

    this.uniforms.atlasTextures.value.splice(layerIndex, 1);
    this.uniforms.atlasTextures.value.push(acquireTexture(emptyAtlas));

    delete this.uniforms[`offsetScale_${layerId}`];
    delete this.offsetScale[l_COLOR][layerId];

    this._updateFragmentShader();
};

LayeredMaterial.prototype.setTexturesLayer = function setTexturesLayer(textures, layerType, layer) {
    const index = this.indexOfColorLayer(layer.id);

    const atlas = _updateAtlas(textures.map(t => t.texture), textures.map(t => t.offsetScale || new THREE.Vector3(0.0, 0.0, 1.0)), layer.transparent);

    atlas.coords = [];
    for (let i = 0; i < atlas.uv.length; i++) {
        atlas.coords.push(textures[i].texture.coords);
        this.offsetScale[l_COLOR][layer.id][i] = atlas.uv[i];
    }


    releaseTexture(this.uniforms.atlasTextures.value[index]);
    this.uniforms.atlasTextures.value[index] = acquireTexture(atlas);
    this.loadedTexturesCount[l_COLOR] += textures.length;

    this._updateFragmentShader();
};

LayeredMaterial.prototype.setElevationTexture = function setElevationTexture(texture, offsetScale) {
    if (this.textures[l_ELEVATION][0] === undefined || this.textures[l_ELEVATION][0].image === undefined) {
        this.loadedTexturesCount[l_ELEVATION] += 1;
    }

    releaseTexture(this.textures[l_ELEVATION][0]);
    this.textures[l_ELEVATION][0] = acquireTexture(texture || emptyTexture);
    this.offsetScale[l_ELEVATION][0] = offsetScale || new THREE.Vector3(0.0, 0.0, 1.0);
};

LayeredMaterial.prototype.pushLayer = function pushLayer(param) {
    const newIndex = this.getColorLayersCount();

    const maxTexturesUnits = Capabilities.getMaxTextureUnitsCount();
    const nbSamplers = Math.min(maxTexturesUnits - 1, 16 - 1) - 1;
    if (newIndex >= nbSamplers) {
        throw new Error(`Can't add layer '${param.idLayer}. That would require ${newIndex} sampler but only ${nbSamplers} are available`);
    }


    this.uniforms.paramLayers.value[newIndex] = new THREE.Vector3();

    this.setLayerFx(newIndex, param.fx);
    this.setLayerOpacity(newIndex, param.opacity);
    this.setLayerVisibility(newIndex, param.visible);
    this.colorLayersId.push(param.idLayer);

    this.offsetScale[l_COLOR][param.idLayer] = param.tileMT === 'PM' ? [vector4, vector4, vector4, vector4] : [vector4];
    this.uniforms[`offsetScale_${param.idLayer}`] = new THREE.Uniform(this.offsetScale[l_COLOR][param.idLayer]);
};

LayeredMaterial.prototype.indexOfColorLayer = function indexOfColorLayer(layerId) {
    return this.colorLayersId.indexOf(layerId);
};

LayeredMaterial.prototype.getColorLayersCount = function getColorLayersCount() {
    return this.colorLayersId.length;
};

LayeredMaterial.prototype.setLightingOn = function setLightingOn(enable) {
    this.uniforms.lightingEnabled.value = enable;
};

LayeredMaterial.prototype.setLayerFx = function setLayerFx(index, fx) {
    this.uniforms.paramLayers.value[index].z = fx;
};

LayeredMaterial.prototype.setLayerOpacity = function setLayerOpacity(index, opacity) {
    if (this.uniforms.paramLayers.value[index]) {
        this.uniforms.paramLayers.value[index].y = opacity;
    }
};

LayeredMaterial.prototype.setLayerVisibility = function setLayerVisibility(index, visible) {
    this.uniforms.paramLayers.value[index].x = visible ? 1 : 0;
};

LayeredMaterial.prototype.getLoadedTexturesCount = function getLoadedTexturesCount() {
    return this.loadedTexturesCount[l_ELEVATION] + this.loadedTexturesCount[l_COLOR];
};

LayeredMaterial.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layerId, zoom) {
    const index = this.indexOfColorLayer(layerId);
    return this.uniforms.atlasTextures.value[index].coords[0].zoom < zoom;
};

LayeredMaterial.prototype.getColorLayerLevelById = function getColorLayerLevelById(colorLayerId) {
    const index = this.indexOfColorLayer(colorLayerId);
    if (index === -1) {
        return EMPTY_TEXTURE_ZOOM;
    }
    return this.uniforms.atlasTextures.value[index].coords[0].zoom;
};

LayeredMaterial.prototype.getElevationLayerLevel = function getElevationLayerLevel() {
    return this.textures[l_ELEVATION][0].coords.zoom;
};

function _updateAtlas(textures, offsetScale, keepAlphaChannel) {
    const { atlas, uv } = pack(textures, offsetScale);

    if (!keepAlphaChannel) {
        atlas.format = THREE.RGBFormat;
    }

    atlas.uv = uv;
    return atlas;
}

LayeredMaterial.prototype.setUuid = function setUuid(uuid) {
    this.uniforms.uuid.value = uuid;
};

LayeredMaterial.prototype.setFogDistance = function setFogDistance(df) {
    this.uniforms.distanceFog.value = df;
};

LayeredMaterial.prototype.setSelected = function setSelected(selected) {
    this.uniforms.selected.value = selected;
};


export default LayeredMaterial;
