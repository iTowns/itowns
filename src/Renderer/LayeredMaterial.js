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
import { l_COLOR, l_ELEVATION, EMPTY_TEXTURE_ZOOM } from './LayeredMaterialConstants';

var emptyTexture = new THREE.Texture();
emptyTexture.coords = { zoom: EMPTY_TEXTURE_ZOOM };

const layerTypesCount = 2;
var vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);
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

var moveElementArray = function moveElementArray(array, oldIndex, newIndex)
{
    array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
};

/* eslint-disable */
var moveElementsArraySafe = function moveElementsArraySafe(array,index, howMany, toIndex) {
    index = parseInt(index) || 0;
    index = index < 0 ? array.length + index : index;
    toIndex = parseInt(toIndex) || 0;
    toIndex = toIndex < 0 ? array.length + toIndex : toIndex;
    if((toIndex > index) && (toIndex <= index + howMany)) {
        toIndex = index + howMany;
    }

    var moved;
    array.splice.apply(array, [toIndex, 0].concat(moved = array.splice(index, howMany)));
    return moved;
};
/* eslint-enable */

const arrayColorLength = 15;
const nbSamplersElevation = 1;

function getTextureSamplerCount() {
    const maxTexturesUnits = Capabilities.getMaxTextureUnitsCount();
    const nbSamplersColor = Math.min(maxTexturesUnits - nbSamplersElevation);
    const sizeColor_01 = nbSamplersColor > arrayColorLength ? arrayColorLength : nbSamplersColor;
    const sizeColor_02 = nbSamplersColor > arrayColorLength ? arrayColorLength : 0;
    return { sizeColor_01, sizeColor_02 };
}

export function getMaxTextureSamplerCount() {
    const { sizeColor_01, sizeColor_02 } = getTextureSamplerCount();
    return sizeColor_01 + sizeColor_02;
}

const LayeredMaterial = function LayeredMaterial(options) {
    THREE.RawShaderMaterial.call(this);

    this.defines = {};

    // There are two separate color samplers with same size
    //
    // Why separate samplers?
    //      getColorAtIdUv can't have more than 16 statements because of compilation memory error
    //      so we can not have a single sampler array of 31 textures
    // Why same size?
    //      If there was 2 arrays of 15 and 16 samplers
    //      so it would require two functions getColorAtIdUv with signatures of different parameters
    const { sizeColor_01, sizeColor_02 } = getTextureSamplerCount();
    const maxColorLayerCount = sizeColor_01 + sizeColor_02;

    this.vertexShader = TileVS;

    this.fragmentShaderHeader = `${PrecisionQualifier}
        const int TEX_UNITS = ${arrayColorLength.toString()};
        const int MAXCOUNTLAYER = ${maxColorLayerCount.toString()};
    `;

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
    this.fragmentShaderHeader += getColorAtIdUv(arrayColorLength);

    this.fragmentShader = this.fragmentShaderHeader + TileFS;
    this.vertexShader = PrecisionQualifier + vsOptions + TileVS;

    // handle Loaded textures count by layer's type uniforms
    this.loadedTexturesCount = [0, 0];

    // Uniform three js needs no empty array
    // WARNING TODO: prevent empty slot, but it's not the solution
    const offsetScale_elevation = [vector4];
    const textureElevation = [emptyTexture];


    const paramLayers = Array(maxColorLayerCount);
    this.layerTexturesCount = Array(maxColorLayerCount);
    fillArray(paramLayers, vector4);
    fillArray(this.layerTexturesCount, 0);

    // Elevation texture
    this.uniforms.texElevation = new THREE.Uniform(textureElevation);
    // Elevation texture cropping
    this.uniforms.offsetScale_elevation = new THREE.Uniform(offsetScale_elevation);

    // First array sampler
    // Color textures's layer 1
    const texColor_01 = Array(sizeColor_01);
    // array color texture offset 1
    const offsetScale_color_01 = Array(sizeColor_01);
    fillArray(texColor_01, emptyTexture);
    fillArray(offsetScale_color_01, vector4);
    this.uniforms.texColor_01 = new THREE.Uniform(texColor_01);
    this.uniforms.offsetScale_color_01 = new THREE.Uniform(offsetScale_color_01);

    // Second array sampler
    if (sizeColor_02) {
        this.defines.SECOND_SAMPLER = 1;
        const texColor_02 = Array(sizeColor_02);
        const offsetScale_color_02 = Array(sizeColor_02);
        fillArray(texColor_02, emptyTexture);
        fillArray(offsetScale_color_02, vector4);
        this.uniforms.texColor_02 = new THREE.Uniform(texColor_02);
        this.uniforms.offsetScale_color_02 = new THREE.Uniform(offsetScale_color_02);
    }

    // Visibility layer
    const visibility = Array(maxColorLayerCount);
    fillArray(visibility, true);
    this.uniforms.visibility = new THREE.Uniform(visibility);

    // Loaded textures count by layer's type
    this.uniforms.loadedTexturesCount = new THREE.Uniform(this.loadedTexturesCount);

    // Count color layers
    this.uniforms.colorLayersCount = new THREE.Uniform(1);

    // Layer setting
    // Offset color texture slot | Projection | fx | Opacity
    this.uniforms.paramLayers = new THREE.Uniform(paramLayers);

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
                    if (!this.getTextureColorByIndex(i).image) {
                        throw new Error(`${node.id} - Missing texture at index ${i} for layer ${layer.id}`);
                    }

                    const critere1 = (offset <= i && i < (offset + count));
                    const search = layer.name ? `LAYERS=${layer.name}&` : `LAYER=${layer.options.name}&`;
                    const critere2 = this.getTextureColorByIndex(i).image.currentSrc.indexOf(search) > 0;

                    if (critere1 && !critere2) {
                        throw new Error(`${node.id} - Texture should belong to ${layer.id} but comes from ${this.getTextureColorByIndex(i).image.currentSrc}`);
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
        for (let i = 0, max = Capabilities.getMaxTextureUnitsCount(); i < max; i++) {
            const texture = this.getTextureByIndex(l, i);
            if (texture instanceof THREE.Texture) {
                texture.dispose();
            }
        }
    }
};

LayeredMaterial.prototype.setSequence = function setSequence(sequenceLayer) {
    let offsetLayer = 0;
    let offsetTexture = 0;

    const originalOffsets = new Array(...this.uniforms.offsetScale_color_01.value);
    const originalTextures = new Array(...this.uniforms.texColor_01.value);

    if (this.uniforms.texColor_02) {
        originalOffsets.push(...this.uniforms.offsetScale_color_02.value);
        originalTextures.push(...this.uniforms.texColor_02.value);
    }

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
                this.setTextureColorByIndex(offsetTexture + i, originalTextures[oldOffset + i], originalOffsets[oldOffset + i]);
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

    const originalTextures = new Array(...this.uniforms.texColor_01.value);
    const originalOffsets = new Array(...this.uniforms.offsetScale_color_01.value);

    if (this.uniforms.texColor_02) {
        originalOffsets.push(...this.uniforms.offsetScale_color_02.value);
        originalTextures.push(...this.uniforms.texColor_02.value);
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
    let loadedTexturesLayerCount = 0;

    for (let i = offset, max = offset + texturesCount; i < max; i++) {
        const texture = this.getTextureColorByIndex(i);
        if (texture instanceof THREE.Texture) {
            texture.dispose();
            if (texture.coords.zoom > EMPTY_TEXTURE_ZOOM) {
                loadedTexturesLayerCount++;
            }
            originalTextures.push(emptyTexture);
            originalOffsets.push(vector4);
        }
    }

    originalTextures.splice(offset, texturesCount);
    originalOffsets.splice(offset, texturesCount);

    this.uniforms.texColor_01.value = originalTextures.slice(0, arrayColorLength);
    this.uniforms.offsetScale_color_01.value = originalOffsets.slice(0, arrayColorLength);

    if (this.uniforms.texColor_02) {
        this.uniforms.texColor_02.value = originalTextures.slice(0, arrayColorLength);
        this.uniforms.offsetScale_color_02.value = originalOffsets.slice(0, arrayColorLength);
    }

    // Update slot start texture layer
    for (let j = layerIndex, mx = this.getColorLayersCount(); j < mx; j++) {
        this.uniforms.paramLayers.value[j].x -= texturesCount;
    }

    this.loadedTexturesCount[l_COLOR] -= loadedTexturesLayerCount;
};

LayeredMaterial.prototype.setTexturesLayer = function setTexturesLayer(textures, layerType, layer) {
    const index = this.indexOfColorLayer(layer);
    const slotOffset = this.getTextureOffsetByLayerIndex(index);
    for (let i = 0, max = textures.length; i < max; i++) {
        if (textures[i]) {
            if (textures[i].texture !== null) {
                this.setTexture(textures[i].texture, layerType, i + (slotOffset || 0), textures[i].pitch);
            } else {
                this.setLayerVisibility(index, false);
                break;
            }
        }
    }
};

LayeredMaterial.prototype.setTexture = function setTexture(texture = emptyTexture, layerType, slot, offsetScale = new THREE.Vector4(0.0, 0.0, 1.0, 1.0)) {
    if (this.getTextureByIndex(layerType, slot) === undefined || this.getTextureByIndex(layerType, slot).image === undefined) {
        this.loadedTexturesCount[layerType] += 1;
    }
    this.setTextureByIndex(layerType, slot, texture, offsetScale);
};

LayeredMaterial.prototype.setColorLayerParameters = function setColorLayerParameters(params) {
    if (this.getColorLayersCount() === 0) {
        for (let l = 0; l < params.length; l++) {
            this.pushLayer(params[l]);
        }
    }
};

LayeredMaterial.prototype.pushLayer = function pushLayer(param) {
    const newIndex = this.getColorLayersCount();
    const offset = newIndex === 0 ? 0 : this.getTextureOffsetByLayerIndex(newIndex - 1) + this.getTextureCountByLayerIndex(newIndex - 1);

    this.uniforms.paramLayers.value[newIndex] = new THREE.Vector4();

    this.setTextureOffsetByLayerIndex(newIndex, offset);
    // If there's only one texture: assume it covers the whole tile,
    // otherwise declare the number of textures
    this.setLayerUV(newIndex, (param.texturesCount == 1) ? 0 : param.texturesCount);
    this.setLayerFx(newIndex, param.fx);
    this.setLayerOpacity(newIndex, param.opacity);
    this.setLayerVisibility(newIndex, param.visible);
    this.setLayerTexturesCount(newIndex, param.texturesCount);
    this.colorLayersId.push(param.idLayer);

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

LayeredMaterial.prototype.getTextureByIndex = function getTextureByIndex(layerType, index) {
    if (layerType == l_COLOR) {
        return this.getTextureColorByIndex(index);
    } else if (layerType == l_ELEVATION) {
        return this.uniforms.texElevation.value[index];
    }
};

LayeredMaterial.prototype.getOffsetByIndex = function getOffsetByIndex(layerType, index) {
    if (layerType == l_COLOR) {
        return this.getOffsetColorByIndex(index);
    } else if (layerType == l_ELEVATION) {
        return this.uniforms.offsetScale_elevation.value[index];
    }
};

LayeredMaterial.prototype.setTextureByIndex = function setTextureByIndex(layerType, index, texture, offsetScale) {
    if (layerType == l_COLOR) {
        this.setTextureColorByIndex(index, texture, offsetScale);
    } else if (layerType == l_ELEVATION) {
        this.uniforms.texElevation.value[index] = texture;
        this.uniforms.offsetScale_elevation.value[index] = offsetScale;
    }
};

LayeredMaterial.prototype.getTextureColorByIndex = function getTextureColorByIndex(index) {
    if (index < arrayColorLength) {
        return this.uniforms.texColor_01.value[index];
    } else if (this.uniforms.texColor_02) {
        return this.uniforms.texColor_02.value[index - arrayColorLength];
    }
};

LayeredMaterial.prototype.getOffsetColorByIndex = function getOffsetColorByIndex(index) {
    if (index < arrayColorLength) {
        return this.uniforms.offsetScale_color_01.value[index];
    } else if (this.uniforms.offsetScale_color_02) {
        return this.uniforms.offsetScale_color_02.value[index - arrayColorLength];
    }
};

LayeredMaterial.prototype.setTextureColorByIndex = function setTextureColorByIndex(index, texture, offset = new THREE.Vector4(0.0, 0.0, 1.0, 1.0)) {
    if (index < arrayColorLength) {
        this.uniforms.texColor_01.value[index] = texture;
        this.uniforms.offsetScale_color_01.value[index] = offset;
    } else if (this.uniforms.texColor_02) {
        this.uniforms.texColor_02.value[index - arrayColorLength] = texture;
        this.uniforms.offsetScale_color_02.value[index - arrayColorLength] = offset;
    }
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

LayeredMaterial.prototype.setLayerOpacity = function setLayerOpacity(index, opacity) {
    if (this.uniforms.paramLayers.value[index])
        { this.uniforms.paramLayers.value[index].w = opacity; }
};

LayeredMaterial.prototype.setLayerVisibility = function setLayerVisibility(index, visible) {
    this.uniforms.visibility.value[index] = visible;
};

LayeredMaterial.prototype.setLayerTexturesCount = function setLayerTexturesCount(index, count) {
    this.layerTexturesCount[index] = count;
};

LayeredMaterial.prototype.getLoadedTexturesCount = function getLoadedTexturesCount() {
    return this.loadedTexturesCount[l_ELEVATION] + this.loadedTexturesCount[l_COLOR];
};

LayeredMaterial.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layerId, zoom) {
    return this.getTextureColorByIndex(this.getLayerTextureOffset(layerId)) &&
        this.getTextureColorByIndex(this.getLayerTextureOffset(layerId)).coords.zoom < zoom;
};

LayeredMaterial.prototype.getColorLayerLevelById = function getColorLayerLevelById(colorLayerId) {
    const index = this.indexOfColorLayer(colorLayerId);
    if (index === -1) {
        return EMPTY_TEXTURE_ZOOM;
    }
    const slot = this.getTextureOffsetByLayerIndex(index);
    const texture = this.getTextureColorByIndex(slot);

    return texture ? texture.coords.zoom : EMPTY_TEXTURE_ZOOM;
};

LayeredMaterial.prototype.getElevationLayerLevel = function getElevationLayerLevel() {
    return this.getTextureByIndex(l_ELEVATION, 0).coords.zoom;
};

LayeredMaterial.prototype.getLayerTextures = function getLayerTextures(layerType, layerId) {
    if (layerType === l_ELEVATION) {
        return this.uniforms.texElevation.value;
    }

    const index = this.indexOfColorLayer(layerId);

    if (index !== -1) {
        const count = this.getTextureCountByLayerIndex(index);
        const textureIndex = this.getTextureOffsetByLayerIndex(index);
        const textures = [];
        for (var i = textureIndex; i < textureIndex + count; i++) {
            textures.push(this.getTextureColorByIndex(i));
        }
        return textures;
    } else {
        throw new Error(`Invalid layer id "${layerId}"`);
    }
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


export default LayeredMaterial;
