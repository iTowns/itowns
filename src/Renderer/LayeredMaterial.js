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
import { l_COLOR, l_ELEVATION, EMPTY_TEXTURE_ZOOM } from './LayeredMaterialConstants';
import pack from './AtlasBuilder';

var emptyTexture = new THREE.Texture();
emptyTexture.coords = { zoom: EMPTY_TEXTURE_ZOOM };

var emptyAtlas = new THREE.Texture();
emptyAtlas.coords = [{ zoom: EMPTY_TEXTURE_ZOOM }];

// make sure we never release empty textures
acquireTexture(emptyTexture);
acquireTexture(emptyAtlas);

const vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);

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
    }
}

const LayeredMaterial = function LayeredMaterial(options) {
    THREE.RawShaderMaterial.call(this);

    this.vertexShader = TileVS;

    options = options || { };
    let vsOptions = '';
    if (options.useRgbaTextureElevation) {
        throw new Error('Restore this feature');
    } else if (options.useColorTextureElevation) {
        this.defines.COLOR_TEXTURE_ELEVATION = 1;
        vsOptions += `\nconst float _minElevation = ${options.colorTextureElevationMinZ.toFixed(1)};\n`;
        vsOptions += `\nconst float _maxElevation = ${options.colorTextureElevationMaxZ.toFixed(1)};\n`;
    } else {
        // default
        this.defines.DATA_TEXTURE_ELEVATION = 1;
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
    var paramLayers = [new THREE.Vector3(0.0, 0.0, 0.0)];

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

    this.uniforms.noTextureColor = new THREE.Uniform(new THREE.Color(0.04, 0.23, 0.35));

    this.uniforms.opacity = new THREE.Uniform(1.0);

    this.colorLayersId = [];
    this.elevationLayersId = [];

    if (Capabilities.isLogDepthBufferSupported()) {
        this.defines.USE_LOGDEPTHBUF = 1;
        this.defines.USE_LOGDEPTHBUF_EXT = 1;
    }

    if (__DEBUG__) {
        this.defines.DEBUG = 1;
    }

    const atlasTextures = [acquireTexture(emptyAtlas)];
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
    // note: releasing texture deallocates that associates GL texture (deallocateTexture in three.js)
    // So releasing an in-use texture cause unnecessary cpu/gpu usage but won't cause
    // visible artifacts.
    releaseTexture(this.textures[l_ELEVATION][0]);

    // release texture atlas
    for (const atlas of this.uniforms.atlasTextures.value) {
        releaseTexture(atlas);
    }
    this.uniforms.atlasTextures.value = [];

    THREE.Material.prototype.dispose.call(this);
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

    const atlas = this.uniforms.atlasTextures.value[layerIndex];
    releaseTexture(atlas);

    this.uniforms.atlasTextures.value.splice(layerIndex, 1);

    delete this.uniforms[`offsetScale_${layerId}`];
    delete this.offsetScale[l_COLOR][layerId];

    this._updateFragmentShader();
};

function _transformTexturesToTHREE(textures, layer) {
    // 2 cases:
    //  - textures has only one texture -> transform it directly in THREE.Texture
    //  - textures has several textures -> build an atlas
    if (textures.length == 1) {
        const t = new THREE.Texture();
        t.image = textures[0].texture;
        t.format = layer.transparent ? THREE.RGBAFormat : THREE.RGBFormat;
        t.needsUpdate = true;
        t.generateMipmaps = false;
        t.magFilter = THREE.LinearFilter;
        t.minFilter = THREE.LinearFilter;
        t.anisotropy = 16;
        t.uv = [new THREE.Vector4(0, 0, 1, 1)];
        return t;
    } else {
        // Packer place image from top to bottom by default, then left to right.
        // Currently, the only layer type for which the Packer is used is WMTS/PM layers,
        // and in this case we can skip the 'color-bleed-preventing' pixel since
        // the image are consecutive.

        // So reverse PM textures
        textures.reverse();

        const atlas = _updateAtlas(textures.map(t => t.texture), textures.map(t => t.offsetScale || new THREE.Vector3(0.0, 0.0, 1.0)), layer.transparent);

        // Now, all is nice and well, except UV coords for PM textures suppose a specific order
        // (see ColorLayerPM.glsl 'int textureIndex = pmSubTextureIndex;' for instance)
        // so... reverse back!
        textures.reverse();
        atlas.uv.reverse();

        // Objective achieved: N images merged as a single one, without wasting space
        // and we'll still fill material.offsetScale()  using the expected order. Phew..
        return atlas;
    }
}

LayeredMaterial.prototype.setTexturesLayer = function setTexturesLayer(textures, layerType, layer) {
    const layerTexture = _transformTexturesToTHREE(textures, layer);

    const index = this.indexOfColorLayer(layer.id);

    layerTexture.coords = [];
    for (let i = 0; i < layerTexture.uv.length; i++) {
        layerTexture.coords.push(textures[i].texture.coords);
        this.offsetScale[l_COLOR][layer.id][i] = layerTexture.uv[i];
    }

    releaseTexture(this.uniforms.atlasTextures.value[index]);
    this.uniforms.atlasTextures.value[index] = acquireTexture(layerTexture);
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

    if (this.uniforms.atlasTextures.value.length <= newIndex) {
        this.uniforms.atlasTextures.value.push(acquireTexture(emptyAtlas));
        this.uniforms.paramLayers.value.push(new THREE.Vector3());
    }

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
    // Pack textures without requiring a pixel separation since we carefully layed out
    // our textures.
    const atlas = pack(textures, offsetScale, false);

    if (!keepAlphaChannel) {
        atlas.format = THREE.RGBFormat;
    }

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
