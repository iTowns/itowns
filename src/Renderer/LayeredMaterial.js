/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import TileVS from './Shader/TileVS.glsl';
import TileFS from './Shader/TileFS.glsl';
import pitUV from './Shader/Chunk/pitUV.glsl';
import PrecisionQualifier from './Shader/Chunk/PrecisionQualifier.glsl';
import Capabilities from '../Core/System/Capabilities';

var emptyTexture = new THREE.Texture();

const layerTypesCount = 2;
var vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);
const l_ELEVATION = 0;
const l_COLOR = 1;
const EMPTY_TEXTURE_ZOOM = -1;
var fooTexture;

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

var getColorAtIdUv = function getColorAtIdUv(nbTex) {
    if (!fooTexture) {
        fooTexture = 'vec4 colorAtIdUv(sampler2D dTextures[TEX_UNITS],vec4 offsetScale[TEX_UNITS],int id, vec2 uv){\n';
        fooTexture += ' if (id == 0) return texture2D(dTextures[0],  pitUV(uv,offsetScale[0]));\n';

        for (var l = 1; l < nbTex; l++) {
            var sL = l.toString();
            fooTexture += `    else if (id == ${sL}) return texture2D(dTextures[${sL}],  pitUV(uv,offsetScale[${sL}]));\n`;
        }

        fooTexture += 'else return vec4(0.0,0.0,0.0,0.0);}\n';
    }

    return fooTexture;
};

// Array not suported in IE
var fillArray = function fillArray(array, remp) {
    for (var i = 0; i < array.length; i++)
        { array[i] = remp; }
};

var moveElementArray = function moveElementArray(array, oldIndex, newIndex) {
    array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
};

// 'options' allows to define what is the datatype of the elevation textures used.
// By default, we assume floating-point textures.
// If the elevation textures are RGB, then 3 values must be set:
//   - useColorTextureElevation: declare that the elevation texture is an RGB textures.
//   - colorTextureElevationMinZ: altitude value mapped on the (0, 0, 0) color
//   - colorTextureElevationMaxZ: altitude value mapped on the (255, 255, 255) color
const LayeredMaterial = function LayeredMaterial(options) {
    THREE.RawShaderMaterial.call(this);

    const maxTexturesUnits = Capabilities.getMaxTextureUnitsCount();
    const nbSamplers = Math.min(maxTexturesUnits - 1, 16 - 1);
    this.vertexShader = TileVS;

    this.fragmentShaderHeader = `${PrecisionQualifier}\nconst int   TEX_UNITS   = ${nbSamplers.toString()};\n`;
    this.fragmentShaderHeader += pitUV;

    if (__DEBUG__) {
        this.fragmentShaderHeader += '#define DEBUG\n';
    }

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

    // see GLOBE FS
    this.fragmentShaderHeader += getColorAtIdUv(nbSamplers);

    this.fragmentShader = this.fragmentShaderHeader + TileFS;
    this.vertexShader = PrecisionQualifier + vsOptions + TileVS;

    // handle on textures uniforms
    this.textures = [];
    // handle on textures offsetScale uniforms
    this.offsetScale = [];
    // handle Loaded textures count by layer's type uniforms
    this.loadedTexturesCount = [0, 0];

    // Uniform three js needs no empty array
    // WARNING TODO: prevent empty slot, but it's not the solution
    this.offsetScale[l_COLOR] = Array(nbSamplers);
    this.offsetScale[l_ELEVATION] = [vector4];
    fillArray(this.offsetScale[l_COLOR], vector4);

    this.textures[l_ELEVATION] = [emptyTexture];
    this.textures[l_COLOR] = Array(nbSamplers);
    var paramLayers = Array(8);
    this.layerTexturesCount = Array(8);

    fillArray(this.textures[l_COLOR], emptyTexture);
    fillArray(paramLayers, vector4);
    fillArray(this.layerTexturesCount, 0);

    // Elevation texture
    this.uniforms.dTextures_00 = new THREE.Uniform(this.textures[l_ELEVATION]);

    // Color textures's layer
    this.uniforms.dTextures_01 = new THREE.Uniform(this.textures[l_COLOR]);

    // Visibility layer
    this.uniforms.visibility = new THREE.Uniform([true, true, true, true, true, true, true, true]);

    // Loaded textures count by layer's type
    this.uniforms.loadedTexturesCount = new THREE.Uniform(this.loadedTexturesCount);

    // Count color layers
    this.uniforms.colorLayersCount = new THREE.Uniform(1);

    // Layer setting
    // Offset color texture slot | Projection | fx | Opacity
    this.uniforms.paramLayers = new THREE.Uniform(paramLayers);

    // Elevation texture cropping
    this.uniforms.offsetScale_L00 = new THREE.Uniform(this.offsetScale[l_ELEVATION]);

    // Color texture cropping
    this.uniforms.offsetScale_L01 = new THREE.Uniform(this.offsetScale[l_COLOR]);

    // Light position
    this.uniforms.lightPosition = new THREE.Uniform(new THREE.Vector3(-0.5, 0.0, 1.0));

    this.uniforms.distanceFog = new THREE.Uniform(1000000000.0);

    this.uniforms.uuid = new THREE.Uniform(0);

    this.uniforms.selected = new THREE.Uniform(false);

    this.uniforms.lightingEnabled = new THREE.Uniform(false);

    this.uniforms.noTextureColor = new THREE.Uniform(new THREE.Color(0.04, 0.23, 0.35));

    this.uniforms.opacity = new THREE.Uniform(1.0);

    this.colorLayersId = [];

    if (Capabilities.isLogDepthBufferSupported()) {
        this.defines = {
            USE_LOGDEPTHBUF: 1,
            USE_LOGDEPTHBUF_EXT: 1,
        };
    } else {
        this.defines = {};
    }

    if (__DEBUG__) {
        this.checkLayersConsistency = function checkLayersConsistency(node, imageryLayers) {
            for (const layer of imageryLayers) {
                const index = this.indexOfColorLayer(layer.id);
                if (index < 0) {
                    continue;
                }

                const offset = this.getTextureOffsetByLayerIndex(index);
                const count = this.getTextureCountByLayerIndex(index);
                let total = 0;
                for (let i = 0; i < this.loadedTexturesCount[1]; i++) {
                    if (!this.uniforms.dTextures_01.value[i].image) {
                        throw new Error(`${node.id} - Missing texture at index ${i} for layer ${layer.id}`);
                    }

                    const critere1 = (offset <= i && i < (offset + count));
                    const search = layer.name ? `LAYERS=${layer.name}&` : `LAYER=${layer.options.name}&`;
                    const critere2 = this.uniforms.dTextures_01.value[i].image.currentSrc.indexOf(search) > 0;

                    if (critere1 && !critere2) {
                        throw new Error(`${node.id} - Texture should belong to ${layer.id} but comes from ${this.uniforms.dTextures_01.value[i].image.currentSrc}`);
                    } else if (!critere1 && critere2) {
                        throw new Error(`${node.id} - Texture shouldn't belong to ${layer.id}`);
                    } else if (critere1) {
                        total++;
                    }
                }
                if (total != count) {
                    throw new Error(`${node.id} - Invalid total texture count. Found: ${total}, expected: ${count} for ${layer.id}`);
                }
            }
        };
    }
};

LayeredMaterial.prototype = Object.create(THREE.RawShaderMaterial.prototype);
LayeredMaterial.prototype.constructor = LayeredMaterial;

LayeredMaterial.prototype.dispose = function dispose() {
    // TODO: WARNING  verify if textures to dispose aren't attached with ancestor

    this.dispatchEvent({
        type: 'dispose',
    });

    for (let l = 0; l < layerTypesCount; l++) {
        for (let i = 0, max = this.textures[l].length; i < max; i++) {
            if (this.textures[l][i] instanceof THREE.Texture) {
                this.textures[l][i].dispose();
            }
        }
    }
};

LayeredMaterial.prototype.setSequence = function setSequence(sequenceLayer) {
    let offsetLayer = 0;
    let offsetTexture = 0;

    const originalOffsets = new Array(...this.uniforms.offsetScale_L01.value);
    const originalTextures = new Array(...this.uniforms.dTextures_01.value);

    for (let l = 0; l < sequenceLayer.length; l++) {
        const layer = sequenceLayer[l];
        const oldIndex = this.indexOfColorLayer(layer);
        if (oldIndex > -1) {
            const newIndex = l - offsetLayer;
            const texturesCount = this.layerTexturesCount[oldIndex];

            // individual values are swapped in place
            if (newIndex !== oldIndex) {
                moveElementArray(this.colorLayersId, oldIndex, newIndex);
                moveElementArray(this.layerTexturesCount, oldIndex, newIndex);
                moveElementArray(this.uniforms.paramLayers.value, oldIndex, newIndex);
                moveElementArray(this.uniforms.visibility.value, oldIndex, newIndex);
            }
            const oldOffset = this.getTextureOffsetByLayerIndex(newIndex);
            // consecutive values are copied from original
            for (let i = 0; i < texturesCount; i++) {
                this.uniforms.offsetScale_L01.value[offsetTexture + i] = originalOffsets[oldOffset + i];
                this.uniforms.dTextures_01.value[offsetTexture + i] = originalTextures[oldOffset + i];
            }


            this.setTextureOffsetByLayerIndex(newIndex, offsetTexture);
            offsetTexture += texturesCount;
        } else {
            offsetLayer++;
        }
    }

    this.uniforms.colorLayersCount.value = this.getColorLayersCount();
};

LayeredMaterial.prototype.removeColorLayer = function removeColorLayer(layer) {
    const layerIndex = this.indexOfColorLayer(layer);

    if (layerIndex === -1) {
        return;
    }

    const offset = this.getTextureOffsetByLayerIndex(layerIndex);
    const texturesCount = this.getTextureCountByLayerIndex(layerIndex);

    // remove layer
    this.colorLayersId.splice(layerIndex, 1);
    this.uniforms.colorLayersCount.value = this.getColorLayersCount();

    // remove nb textures
    this.layerTexturesCount.splice(layerIndex, 1);
    this.layerTexturesCount.push(0);

    // Remove Layers Parameters
    this.uniforms.paramLayers.value.splice(layerIndex, 1);
    this.uniforms.paramLayers.value.push(vector4);

    // Remove visibility Parameters
    this.uniforms.visibility.value.splice(layerIndex, 1);
    this.uniforms.visibility.value.push(true);

    // Dispose Layers textures
    for (let i = offset, max = offset + texturesCount; i < max; i++) {
        if (this.textures[l_COLOR][i] instanceof THREE.Texture) {
            this.textures[l_COLOR][i].dispose();
        }
    }

    const removedTexturesLayer = this.textures[l_COLOR].splice(offset, texturesCount);
    this.offsetScale[l_COLOR].splice(offset, texturesCount);

    const loadedTexturesLayerCount = removedTexturesLayer.reduce((sum, texture) => sum + (texture.coords.zoom > EMPTY_TEXTURE_ZOOM), 0);

    // refill remove textures
    for (let i = 0, max = texturesCount; i < max; i++) {
        this.textures[l_COLOR].push(emptyTexture);
        this.offsetScale[l_COLOR].push(vector4);
    }

    // Update slot start texture layer
    for (let j = layerIndex, mx = this.getColorLayersCount(); j < mx; j++) {
        this.uniforms.paramLayers.value[j].x -= texturesCount;
    }

    this.loadedTexturesCount[l_COLOR] -= loadedTexturesLayerCount;

    this.uniforms.offsetScale_L01.value = this.offsetScale[l_COLOR];
    this.uniforms.dTextures_01.value = this.textures[l_COLOR];
};

LayeredMaterial.prototype.getLayerTextures = function getLayerTextures(layer) {
    if (layer.type === 'elevation') {
        return {
            textures: this.textures[l_ELEVATION],
            offsetScales: this.offsetScale[l_ELEVATION],
        };
    }

    const index = this.indexOfColorLayer(layer.id);

    if (index !== -1) {
        const count = this.getTextureCountByLayerIndex(index);
        const textureIndex = this.getTextureOffsetByLayerIndex(index);
        return {
            textures: this.textures[l_COLOR].slice(textureIndex, textureIndex + count),
            offsetScales: this.offsetScale[l_COLOR].slice(textureIndex, textureIndex + count),
        };
    } else {
        // throw new Error(`Invalid layer "${layer}"`);
    }
};

LayeredMaterial.prototype.setLayerTextures = function setLayerTextures(layer, textures) {
    if (layer.type === 'elevation') {
        if (Array.isArray(textures)) {
            textures = textures[0];
        }
        this._setTexture(textures.texture, l_ELEVATION, 0, textures.pitch);
    } else if (layer.type === 'color') {
        const index = this.indexOfColorLayer(layer.id);
        const slotOffset = this.getTextureOffsetByLayerIndex(index);
        if (Array.isArray(textures)) {
            for (let i = 0, max = textures.length; i < max; i++) {
                if (textures[i]) {
                    if (textures[i].texture !== null) {
                        this._setTexture(textures[i].texture, l_COLOR,
                            i + (slotOffset || 0), textures[i].pitch);
                    } else {
                        this.setLayerVisibility(index, false);
                        break;
                    }
                }
            }
        } else if (textures.texture !== null) {
            this._setTexture(textures.texture, l_COLOR, (slotOffset || 0), textures.pitch);
        } else {
            this.setLayerVisibility(index, false);
        }
    } else {
        throw new Error(`Unsupported layer type '${layer.type}'`);
    }
};

LayeredMaterial.prototype._setTexture = function _setTexture(texture, layerType, slot, offsetScale) {
    if (this.textures[layerType][slot] === undefined || this.textures[layerType][slot].image === undefined) {
        this.loadedTexturesCount[layerType] += 1;
    }

    // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11
    this.textures[layerType][slot] = texture || emptyTexture;
    this.offsetScale[layerType][slot] = offsetScale || new THREE.Vector4(0.0, 0.0, 1.0, 1.0);
};

LayeredMaterial.prototype.setColorLayerParameters = function setColorLayerParameters(params) {
    if (this.getColorLayersCount() === 0) {
        for (let l = 0; l < params.length; l++) {
            this.pushLayer(params[l]);
        }
    }
};

LayeredMaterial.prototype.pushLayer = function pushLayer(layer, extents) {
    const newIndex = this.getColorLayersCount();
    const offset = newIndex === 0 ?
        0 :
        this.getTextureOffsetByLayerIndex(newIndex - 1) + this.getTextureCountByLayerIndex(newIndex - 1);

    this.uniforms.paramLayers.value[newIndex] = new THREE.Vector4();

    this.setTextureOffsetByLayerIndex(newIndex, offset);
    // If there's only one texture: assume it covers the whole tile,
    // otherwise declare the number of textures
    this.setLayerUV(newIndex, (extents.length == 1) ? 0 : extents.length);
    this.setLayerFx(newIndex, layer.fx);
    this.setLayerOpacity(newIndex, layer.opacity);
    this.setLayerVisibility(newIndex, layer.visible);
    this.setLayerTexturesCount(newIndex, extents.length);
    this.colorLayersId.push(layer.id);

    this.uniforms.colorLayersCount.value = this.getColorLayersCount();
};

LayeredMaterial.prototype.indexOfColorLayer = function indexOfColorLayer(layerId) {
    return this.colorLayersId.indexOf(layerId);
};

LayeredMaterial.prototype.getColorLayersCount = function getColorLayersCount() {
    return this.colorLayersId.length;
};

LayeredMaterial.prototype.getTextureOffsetByLayerIndex = function getTextureOffsetByLayerIndex(index) {
    return this.uniforms.paramLayers.value[index].x;
};

LayeredMaterial.prototype.getTextureCountByLayerIndex = function getTextureCountByLayerIndex(index) {
    return this.layerTexturesCount[index];
};

LayeredMaterial.prototype.getLayerTextureOffset = function getLayerTextureOffset(layerId) {
    const index = this.indexOfColorLayer(layerId);
    return index > -1 ? this.getTextureOffsetByLayerIndex(index) : -1;
};

LayeredMaterial.prototype.setLightingOn = function setLightingOn(enable) {
    this.uniforms.lightingEnabled.value = enable;
};

LayeredMaterial.prototype.setLayerFx = function setLayerFx(index, fx) {
    this.uniforms.paramLayers.value[index].z = fx;
};

LayeredMaterial.prototype.setTextureOffsetByLayerIndex = function setTextureOffsetByLayerIndex(index, offset) {
    this.uniforms.paramLayers.value[index].x = offset;
};

LayeredMaterial.prototype.setLayerUV = function setLayerUV(index, idUV) {
    this.uniforms.paramLayers.value[index].y = idUV;
};

LayeredMaterial.prototype.getLayerUV = function setLayerUV(index) {
    return this.uniforms.paramLayers.value[index].y;
};

LayeredMaterial.prototype.setLayerOpacity = function setLayerOpacity(layer, opacity) {
    const index = Number.isInteger(layer) ? layer : this.indexOfColorLayer(layer.id);
    if (this.uniforms.paramLayers.value[index]) {
        this.uniforms.paramLayers.value[index].w = opacity;
    }
};

LayeredMaterial.prototype.setLayerVisibility = function setLayerVisibility(layer, visible) {
    const index = Number.isInteger(layer) ? layer : this.indexOfColorLayer(layer.id);
    this.uniforms.visibility.value[index] = visible;
};

LayeredMaterial.prototype.setLayerTexturesCount = function setLayerTexturesCount(index, count) {
    this.layerTexturesCount[index] = count;
};

LayeredMaterial.prototype.getLoadedTexturesCount = function getLoadedTexturesCount() {
    return this.loadedTexturesCount[l_ELEVATION] + this.loadedTexturesCount[l_COLOR];
};

LayeredMaterial.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layer, zoom) {
    return this.textures[l_COLOR][this.getLayerTextureOffset(layer.id)] &&
        this.textures[l_COLOR][this.getLayerTextureOffset(layer.id)].coords.zoom < zoom;
};

LayeredMaterial.prototype.getColorLayerLevelById = function getColorLayerLevelById(colorLayerId) {
    const index = this.indexOfColorLayer(colorLayerId);
    if (index === -1) {
        return EMPTY_TEXTURE_ZOOM;
    }
    const slot = this.getTextureOffsetByLayerIndex(index);
    const texture = this.textures[l_COLOR][slot];

    return texture ? texture.coords.zoom : EMPTY_TEXTURE_ZOOM;
};

LayeredMaterial.prototype.isColorLayerLoaded = function isColorLayerLoaded(layer) {
    const textureInfo = this.getLayerTextures(layer);
    if (textureInfo && textureInfo.textures.length) {
        return textureInfo.textures[0].extent != undefined;
    }
    return false;
};

LayeredMaterial.prototype.getElevationLayerLevel = function getElevationLayerLevel() {
    return this.textures[l_ELEVATION][0].coords.zoom;
};

LayeredMaterial.prototype.setUuid = function setUuid(uuid) {
    this.uniforms.uuid.value = uuid;
};

LayeredMaterial.prototype.setFogDistance = function setFogDistance(df) {
    this.uniforms.distanceFog.value = df;
};

LayeredMaterial.prototype.setSelected = function setSelected(selected) {
    this.uniforms.selected.value = selected;
};

LayeredMaterial.prototype.isElevationLayerLoaded = function isElevationLayerLoaded() {
    return this.loadedTexturesCount[l_ELEVATION] > 0;
};

export default LayeredMaterial;
