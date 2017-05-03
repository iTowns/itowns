/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import BasicMaterial from './BasicMaterial';
import gfxEngine from './c3DEngine';
import GlobeVS from './Shader/GlobeVS.glsl';
import GlobeFS from './Shader/GlobeFS.glsl';
import pitUV from './Shader/Chunk/pitUV.glsl';

export const EMPTY_TEXTURE_ZOOM = -1;

const offsetToParent = function offsetToParent(cWMTS, levelParent) {
    const diffLevel = cWMTS.zoom - levelParent;
    const diff = Math.pow(2, diffLevel);
    const invDiff = 1 / diff;

    const r = (cWMTS.row - (cWMTS.row % diff)) * invDiff;
    const c = (cWMTS.col - (cWMTS.col % diff)) * invDiff;

    return new THREE.Vector3(
        cWMTS.col * invDiff - c,
        cWMTS.row * invDiff - r,
        invDiff);
};

var emptyTexture = new THREE.Texture();
emptyTexture.coordWMTS = { zoom: EMPTY_TEXTURE_ZOOM };

const layerTypesCount = 2;
var vector = new THREE.Vector3(0.0, 0.0, 0.0);
var vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);
var fooTexture;

export const l_ELEVATION = 0;
export const l_COLOR = 1;

var getColorAtIdUv = function getColorAtIdUv(nbTex) {
    if (!fooTexture) {
        fooTexture = 'vec4 colorAtIdUv(sampler2D dTextures[TEX_UNITS],vec3 offsetScale[TEX_UNITS],int id, vec2 uv){\n';
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

var moveElementsArray = function moveElementsArray(array, index, howMany, toIndex) {
    if ((toIndex > index) && (toIndex <= index + howMany)) {
        toIndex = index + howMany;
    }

    array.splice.apply(array, [toIndex, 0].concat(array.splice(index, howMany)));
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

const LayeredMaterial = function LayeredMaterial(material, coordsDestination, coordsSource) {
    BasicMaterial.call(this);

    const maxTexturesUnits = gfxEngine().glParams.maxTexturesUnits;
    const nbSamplers = Math.min(maxTexturesUnits - 2, 16 - 2);
    this.vertexShader = GlobeVS;

    this.fragmentShaderHeader += `const int   TEX_UNITS   = ${nbSamplers.toString()};\n`;
    this.fragmentShaderHeader += pitUV;

    if (__DEBUG__) {
        this.fragmentShaderHeader += '#define DEBUG\n';
    }

    // see GLOBE FS
    this.fragmentShaderHeader += getColorAtIdUv(nbSamplers);

    this.fragmentShader = this.fragmentShaderHeader + GlobeFS;
    this.vertexShader = this.vertexShaderHeader + GlobeVS;

    // handle on textures uniforms
    this.textures = [];
    // handle on textures offsetScale uniforms
    this.offsetScale = [];
    // handle Loaded textures count by layer's type uniforms
    this.loadedTexturesCount = [0, 0];

    // Uniform three js needs no empty array
    // WARNING TODO: prevent empty slot, but it's not the solution
    this.offsetScale[l_COLOR] = Array(nbSamplers);
    this.offsetScale[l_ELEVATION] = [vector];
    fillArray(this.offsetScale[l_COLOR], vector);

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

    this.uniforms.featureTexture = new THREE.Uniform(new THREE.Texture());

    this.uniforms.rasterFeatures = new THREE.Uniform(false);

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

    this.colorLayersId = [];
    this.elevationLayersId = [];

    if (material instanceof LayeredMaterial) {
        // inherit parent's elevation texture
        if (material.getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
            this.textures[l_ELEVATION][0] = material.textures[l_ELEVATION][0];
            this.offsetScale[l_ELEVATION][0] = offsetToParent(coordsDestination.WGS84G[1], this.textures[l_ELEVATION][0].coordWMTS.zoom);
            this.loadedTexturesCount[l_ELEVATION] = 1;
            this.elevationLayersId = material.elevationLayersId;
        }

        // inherit parent's lighting
        this.uniforms.lightPosition.value = material.uniforms.lightPosition.value;
        this.uniforms.lightingEnabled.value = material.uniforms.lightingEnabled.value;

        // inherit parent's color texture
        let offsetTextures = 0;
        // for all color layers
        for (let i = 0; i < material.colorLayersId.length; i++) {
            const layerId = material.colorLayersId[i];
            // if parent's color layer is loaded
            if (material.getColorLayerLevelById(layerId) > EMPTY_TEXTURE_ZOOM) {
                // 1) ADD color layer to child
                this.colorLayersId.push(layerId);
                // Get new layer index
                const index = this.colorLayersId.length - 1;

                // 2) UPDATE Params layer
                this.setLayerVisibility(material.uniforms.visibility.value[i]);
                // Copy param layer
                paramLayers[index] = new THREE.Vector4().copy(material.uniforms.paramLayers.value[i]);
                const params = paramLayers[index];
                // update offset texture
                params.x = offsetTextures;

                // 3) CONNECT parent's textures to child
                const tileMatrixSet = params.y;
                const coordSource = tileMatrixSet ? coordsSource.PM : coordsSource.WGS84G;
                // Compute first row from destination
                const firstRowParent = Math.pow(2, coordSource[0].zoom) - coordSource[1].row - 1;

                const texturesCount = tileMatrixSet ? coordsDestination.PM[1].row - coordsDestination.PM[0].row + 1 : 1;

                const coordDest = tileMatrixSet ? coordsDestination.PM[1].clone() : coordsDestination.WGS84G[1].clone();
                // Count all destination row
                const rowDestCount = Math.pow(2, coordDest.zoom);
                // Get texture from parent
                for (let t = params.x; t < params.x + texturesCount; t++) {
                    // Compute texture destination's row
                    const row = rowDestCount - coordDest.row - 1;
                    // Compute texture source's row
                    const rowSource = Math.trunc(row * 0.5);
                    const slotSource = rowSource - firstRowParent + material.getTextureOffsetByLayerIndex(i);

                    // Connect texture source to destination
                    this.textures[l_COLOR][t] = material.textures[l_COLOR][slotSource];
                    // Compute offset
                    this.offsetScale[l_COLOR][t] = offsetToParent(coordDest, this.textures[l_COLOR][t].coordWMTS.zoom);
                    // TODO reverse storage textures in Array Textures
                    coordDest.row--;
                }

                this.layerTexturesCount[index] = texturesCount;
                offsetTextures += texturesCount;
            }
        }
        this.loadedTexturesCount[l_COLOR] = offsetTextures;
        this.uniforms.colorLayersCount.value = this.colorLayersId.length;
    }
};

LayeredMaterial.prototype = Object.create(BasicMaterial.prototype);
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

    for (let l = 0; l < sequenceLayer.length; l++) {
        const layer = sequenceLayer[l];
        const oldIndex = this.indexOfColorLayer(layer);
        if (oldIndex > -1) {
            const newIndex = l - offsetLayer;
            const texturesCount = this.layerTexturesCount[oldIndex];

            if (newIndex !== oldIndex) {
                moveElementArray(this.colorLayersId, oldIndex, newIndex);
                moveElementArray(this.layerTexturesCount, oldIndex, newIndex);
                moveElementArray(this.uniforms.paramLayers.value, oldIndex, newIndex);
                moveElementArray(this.uniforms.visibility.value, oldIndex, newIndex);
                const oldOffset = this.getTextureOffsetByLayerIndex(newIndex);
                moveElementsArray(this.uniforms.offsetScale_L01.value, oldOffset, texturesCount, offsetTexture);
                moveElementsArray(this.uniforms.dTextures_01.value, oldOffset, texturesCount, offsetTexture);
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

    const loadedTexturesLayerCount = removedTexturesLayer.reduce((sum, texture) => sum + (texture.coordWMTS.zoom > EMPTY_TEXTURE_ZOOM), 0);

    // refill remove textures
    for (let i = 0, max = texturesCount; i < max; i++) {
        this.textures[l_COLOR].push(emptyTexture);
        this.offsetScale[l_COLOR].push(vector);
    }

    // Update slot start texture layer
    for (let j = layerIndex, mx = this.getColorLayersCount(); j < mx; j++) {
        this.uniforms.paramLayers.value[j].x -= texturesCount;
    }

    this.loadedTexturesCount[l_COLOR] -= loadedTexturesLayerCount;

    this.uniforms.offsetScale_L01.value = this.offsetScale[l_COLOR];
    this.uniforms.dTextures_01.value = this.textures[l_COLOR];
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

LayeredMaterial.prototype.setTexture = function setTexture(texture, layerType, slot, offsetScale) {
    if (this.textures[layerType][slot] === undefined || this.textures[layerType][slot].image === undefined) {
        this.loadedTexturesCount[layerType] += 1;
    }

    // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11
    this.textures[layerType][slot] = texture || emptyTexture;
    this.offsetScale[layerType][slot] = offsetScale || new THREE.Vector3(0.0, 0.0, 1.0);
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
    this.setLayerUV(newIndex, param.tileMT === 'PM' ? 1 : 0);
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

LayeredMaterial.prototype.setFeatureLayerVisibility = function setFeatureLayerVisibility(visible) {
    this.uniforms.rasterFeatures.value = visible;
};

LayeredMaterial.prototype.setLayerTexturesCount = function setLayerTexturesCount(index, count) {
    this.layerTexturesCount[index] = count;
};

LayeredMaterial.prototype.getLoadedTexturesCount = function getLoadedTexturesCount() {
    return this.loadedTexturesCount[l_ELEVATION] + this.loadedTexturesCount[l_COLOR];
};

LayeredMaterial.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layerId, scaledCoords) {
    const index = this.indexOfColorLayer(layerId);
    const zoom = this.uniforms.paramLayers.value[index].y ? scaledCoords.PM[0].zoom : scaledCoords.WGS84G[0].zoom;
    return this.textures[l_COLOR][this.getLayerTextureOffset(layerId)] &&
        this.textures[l_COLOR][this.getLayerTextureOffset(layerId)].coordWMTS.zoom < zoom;
};

LayeredMaterial.prototype.isLayerTypeDownscaled = function isLayerTypeDownscaled(layerType, scaledCoords) {
    if (layerType === l_ELEVATION) {
        const tex = this.textures[l_ELEVATION][0];
        //   - blank texture (eg: empty xbil texture)
        if (tex.coordWMTS.zoom === EMPTY_TEXTURE_ZOOM) {
            return false;
        }
        //   - regular texture
        return tex.coordWMTS.zoom < scaledCoords.WGS84G[0].zoom;
    } else if (layerType === l_COLOR) {
        // browse each layer
        for (let index = 0, max = this.colorLayersId.length; index < max; index++) {
            const offset = this.getTextureOffsetByLayerIndex(index);
            const texture = this.textures[l_COLOR][offset];
            const zoom = this.uniforms.paramLayers.value[index].y ? scaledCoords.PM[0].zoom : scaledCoords.WGS84G[0].zoom;
            if (texture.coordWMTS.zoom < zoom) {
                return true;
            }
        }
    }

    return false;
};

LayeredMaterial.prototype.getColorLayerLevelById = function getColorLayerLevelById(colorLayerId) {
    const index = this.indexOfColorLayer(colorLayerId);
    if (index === -1) {
        return EMPTY_TEXTURE_ZOOM;
    }
    const slot = this.getTextureOffsetByLayerIndex(index);
    const texture = this.textures[l_COLOR][slot];

    return texture ? texture.coordWMTS.zoom : EMPTY_TEXTURE_ZOOM;
};

LayeredMaterial.prototype.getElevationLayerLevel = function getElevationLayerLevel() {
    return this.textures[l_ELEVATION][0].coordWMTS.zoom;
};

LayeredMaterial.prototype.getLayerTextures = function getLayerTextures(layerType, layerId) {
    if (layerType === l_ELEVATION) {
        return this.textures[l_ELEVATION];
    }

    const index = this.indexOfColorLayer(layerId);

    if (index !== -1) {
        const count = this.getTextureCountByLayerIndex(index);
        const textureIndex = this.getTextureOffsetByLayerIndex(index);
        return this.textures[l_COLOR].slice(textureIndex, textureIndex + count);
    } else {
        throw new Error(`Invalid layer id "${layerId}"`);
    }
};

export default LayeredMaterial;
