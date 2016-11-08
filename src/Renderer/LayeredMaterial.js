/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import BasicMaterial from 'Renderer/BasicMaterial';
import gfxEngine from 'Renderer/c3DEngine';
import JavaTools from 'Core/System/JavaTools';
import GlobeVS from 'Renderer/Shader/GlobeVS.glsl';
import GlobeFS from 'Renderer/Shader/GlobeFS.glsl';
import pitUV from 'Renderer/Shader/Chunk/pitUV.glsl';

var emptyTexture = new THREE.Texture();
emptyTexture.level = -1;

const layerTypesCount = 2;
var vector = new THREE.Vector3(0.0, 0.0, 0.0);
var vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);
var showDebug = false;
var fooTexture;

export const l_ELEVATION = 0;
export const l_COLOR = 1;

var getColorAtIdUv = function(nbTex) {

    if (!fooTexture) {
        fooTexture = 'vec4 colorAtIdUv(sampler2D dTextures[TEX_UNITS],vec3 offsetScale[TEX_UNITS],int id, vec2 uv){\n';
        fooTexture += ' if (id == 0) return texture2D(dTextures[0],  pitUV(uv,offsetScale[0]));\n';

        for (var l = 1; l < nbTex; l++) {

            var sL = l.toString();
            fooTexture += '    else if (id == ' + sL + ') return texture2D(dTextures[' + sL + '],  pitUV(uv,offsetScale[' + sL + ']));\n';
        }

        fooTexture += 'else return vec4(0.0,0.0,0.0,0.0);}\n';
    }

    return fooTexture;
};

// Array not suported in IE
var fillArray = function(array,remp){

    for(var i=0;i<array.length;i++)
        array[i] = remp;
};

var moveElementArray = function(array,old_index, new_index)
{
    array.splice(new_index, 0, array.splice(old_index, 1)[0]);
};

var moveElementsArray = function (array,index, howMany, toIndex) {
    if((toIndex > index) && (toIndex <= index + howMany)) {
        toIndex = index + howMany;
    }

    array.splice.apply(array, [toIndex, 0].concat(array.splice(index, howMany)));
};

/* eslint-disable */
var moveElementsArraySafe = function (array,index, howMany, toIndex) {
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

var LayeredMaterial = function(id) {

    BasicMaterial.call(this);

    var maxTexturesUnits =  gfxEngine().glParams.maxTexturesUnits;
    var nbSamplers = Math.min(maxTexturesUnits-1,16-1);
    this.vertexShader = GlobeVS;

    this.fragmentShaderHeader +='const int   TEX_UNITS   = ' + nbSamplers.toString() + ';\n';
    this.fragmentShaderHeader += pitUV;

    if(showDebug)
        this.fragmentShaderHeader += '#define DEBUG\n';

    // see GLOBE FS
    this.fragmentShaderHeader += getColorAtIdUv(nbSamplers);

    this.fragmentShader = this.fragmentShaderHeader + GlobeFS;
    this.vertexShader = this.vertexShaderHeader + GlobeVS;

    // handle on textures uniforms
    this.Textures = [];
    // handle on textures offsetScale uniforms
    this.offsetScale = [];
    // handle on textures number uniforms
    this.texturesCount = [0,0];

    // Uniform three js needs no empty array
    // WARNING TODO: prevent empty slot, but it's not the solution
    this.offsetScale[l_COLOR] = Array(nbSamplers);
    this.offsetScale[l_ELEVATION] = [vector];
    fillArray(this.offsetScale[l_COLOR],vector) ;

    this.Textures[0] = [emptyTexture];
    this.Textures[1] = Array(nbSamplers);
    var paramLayers = Array(8);
    this.layerTexturesCount = Array(8);

    fillArray(this.Textures[1],emptyTexture);
    fillArray(paramLayers,vector4);
    fillArray(this.layerTexturesCount,0);

    // Elevation texture
    this.uniforms.dTextures_00 = new THREE.Uniform(this.Textures[0]);

    // Color textures's layer
    this.uniforms.dTextures_01 = new THREE.Uniform(this.Textures[1]);

    // Visibility layer
    this.uniforms.visibility = new THREE.Uniform([true,true,true,true,true,true,true,true]);

    // Array : Number total texture by type
    this.uniforms.texturesCount = new THREE.Uniform(this.texturesCount);

    // Count color layers
    this.uniforms.nColorLayer = new THREE.Uniform(1);

    // layer setting
    // offset color texture | Projection | fx | Opacity
    this.uniforms.paramLayers = new THREE.Uniform(paramLayers);

    // Elevation texture cropping
    this.uniforms.offsetScale_L00 = new THREE.Uniform(this.offsetScale[0]);

    // Color texture cropping
    this.uniforms.offsetScale_L01 = new THREE.Uniform(this.offsetScale[1]);

    // Switch light
    this.uniforms.lightingOn = new THREE.Uniform(gfxEngine().lightingOn);

    // Light position
    this.uniforms.lightPosition = new THREE.Uniform(new THREE.Vector3(-0.5, 0.0, 1.0));

    this.setUuid(id || 0);
    this.wireframe = false;
    //this.wireframe = true;

    this.colorLayersId = [];
};

LayeredMaterial.prototype = Object.create(BasicMaterial.prototype);
LayeredMaterial.prototype.constructor = LayeredMaterial;

LayeredMaterial.prototype.dispose = function() {

    // TODO: WARNING  verify if textures to dispose aren't attached with ancestor

    this.dispatchEvent({
        type: 'dispose'
    });

    for (var l = 0; l < layerTypesCount; l++) {
        for (var i = 0, max = this.Textures[l].length; i < max; i++) {
            if (this.Textures[l][i] instanceof THREE.Texture) {
                this.Textures[l][i].dispose();
            }
        }
    }

    var jT = new JavaTools();

    jT.freeArray(this.Textures[0]);
    jT.freeArray(this.Textures[1]);

    jT.freeArray(this.uniforms.dTextures_00.value);
    jT.freeArray(this.uniforms.dTextures_01.value);
};

LayeredMaterial.prototype.setSequence = function(sequenceLayer) {

    let offsetLayer = 0;
    let offsetTexture = 0;

    for (let l = 0; l < sequenceLayer.length; l++) {

        let layer = sequenceLayer[l];
        let oldIndex = this.indexOfColorLayer(layer);
        if(oldIndex>-1) {

            let newIndex = l-offsetLayer;
            let texturesCount = this.layerTexturesCount[oldIndex];

            if(newIndex !== oldIndex) {

                moveElementArray(this.colorLayersId,oldIndex,newIndex);
                moveElementArray(this.layerTexturesCount,oldIndex,newIndex);
                moveElementArray(this.uniforms.paramLayers.value,oldIndex,newIndex);
                moveElementArray(this.uniforms.visibility.value,oldIndex,newIndex);
                let oldOffset = this.getTextureOffsetByLayerIndex(newIndex);
                moveElementsArray(this.uniforms.offsetScale_L01.value,oldOffset,texturesCount,offsetTexture);
                moveElementsArray(this.uniforms.dTextures_01.value,oldOffset,texturesCount,offsetTexture);
            }

            this.setLayerOffset(newIndex,offsetTexture);
            offsetTexture += texturesCount;

        } else {
            offsetLayer++;
        }
    }

    this.uniforms.nColorLayer.value = this.getColorLayersCount();
};

LayeredMaterial.prototype.removeColorLayer = function(layer) {

    var layerIndex = this.indexOfColorLayer(layer);

    if (layerIndex === -1) {
        return;
    }

    var offset = this.getTextureOffsetByLayerIndex(layerIndex);
    var texturesCount = this.getTextureCountByLayerIndex(layerIndex);

    // remove layer
    this.colorLayersId.splice(layerIndex, 1);
    this.uniforms.nColorLayer.value = this.getColorLayersCount();

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
    for (i = offset, max = offset + texturesCount; i < max; i++) {
        if (this.Textures[l_COLOR][i] instanceof THREE.Texture)
            this.Textures[l_COLOR][i].dispose();
    }

    this.Textures[l_COLOR].splice(offset, texturesCount);
    this.offsetScale[l_COLOR].splice(offset, texturesCount);

    // refill remove textures
    for (var i = 0, max = texturesCount; i < max; i++) {
        this.Textures[l_COLOR].push(emptyTexture);
        this.offsetScale[l_COLOR].push(vector);
    }

    // Update slot start texture layer
    for (var j = layerIndex, mx = this.getColorLayersCount(); j < mx; j++)
        this.uniforms.paramLayers.value[j].x -= texturesCount;

    this.texturesCount[l_COLOR] -= texturesCount;

    this.uniforms.offsetScale_L01.value = this.offsetScale[l_COLOR];
    this.uniforms.dTextures_01.value = this.Textures[l_COLOR];

};

LayeredMaterial.prototype.setTexturesLayer = function(textures, layerType, layer) {
    var index = this.indexOfColorLayer(layer);
    var slotOffset = this.getTextureOffsetByLayerIndex(index);
    for (var i = 0, max = textures.length; i < max; i++) {
        if (textures[i]) {
            if(textures[i].texture !== null) {
                this.setTexture(textures[i].texture, layerType, i + (slotOffset || 0), textures[i].pitch);
            } else {
                this.setLayerVisibility(index,false);
                break;
            }
        }
    }
};

LayeredMaterial.prototype.setTexture = function(texture, layerType, slot, offsetScale) {

    if (this.Textures[layerType][slot] === undefined || this.Textures[layerType][slot].image === undefined) {
        this.texturesCount[layerType] += 1;
    }

    // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11
    this.Textures[layerType][slot] = texture ? texture : emptyTexture;
    this.offsetScale[layerType][slot] = offsetScale ? offsetScale : new THREE.Vector3(0.0, 0.0, 1.0);
};

LayeredMaterial.prototype.setColorLayerParameters = function(params) {
    if(this.getColorLayersCount() === 0) {
        for (var l = 0; l < params.length; l++) {
            this.pushLayer(params[l]);
        }
    }
};

LayeredMaterial.prototype.pushLayer = function(param) {

    let newIndex = this.getColorLayersCount();
    let offset = newIndex === 0 ? 0 : this.getTextureOffsetByLayerIndex(newIndex-1) + this.getTextureCountByLayerIndex(newIndex-1);

    this.uniforms.paramLayers.value[newIndex] = new THREE.Vector4();

    this.setLayerOffset(newIndex,offset);
    this.setLayerUV(newIndex,param.tileMT === 'PM' ? 1 : 0);
    this.setLayerFx(newIndex,param.fx);
    this.setLayerOpacity(newIndex,param.opacity);
    this.setLayerVisibility(newIndex,param.visible);
    this.setLayerTexturesCount(newIndex,param.texturesCount);
    this.colorLayersId.push(param.idLayer);

    this.uniforms.nColorLayer.value = this.getColorLayersCount();
};

LayeredMaterial.prototype.indexOfColorLayer = function(layer) {
    return this.colorLayersId.indexOf(layer);
};

LayeredMaterial.prototype.getColorLayersCount = function() {
    return this.colorLayersId.length;
};

LayeredMaterial.prototype.getTextureOffsetByLayerIndex = function(index) {
    return this.uniforms.paramLayers.value[index].x;
};

LayeredMaterial.prototype.getTextureCountByLayerIndex = function(index) {
    return this.layerTexturesCount[index];
};

LayeredMaterial.prototype.getLayerTextureOffset = function(layer) {
    var index = this.indexOfColorLayer(layer);
    return index > -1 ? this.getTextureOffsetByLayerIndex(index) : -1;
};

LayeredMaterial.prototype.setLightingOn = function(enable) {
    this.uniforms.lightingOn.value = enable;
};

LayeredMaterial.prototype.setLayerFx = function(index, fx) {
    this.uniforms.paramLayers.value[index].z = fx;
};

LayeredMaterial.prototype.setLayerOffset = function(index, offset) {
    this.uniforms.paramLayers.value[index].x = offset;
};

LayeredMaterial.prototype.setLayerUV = function(index, idUV) {
    this.uniforms.paramLayers.value[index].y = idUV;
};

LayeredMaterial.prototype.setLayerOpacity = function(index, opacity) {
    if(this.uniforms.paramLayers.value[index])
        this.uniforms.paramLayers.value[index].w = opacity;
};

LayeredMaterial.prototype.setLayerVisibility = function(index, visible) {
    this.uniforms.visibility.value[index] = visible;
};

LayeredMaterial.prototype.setLayerTexturesCount = function(index, count) {
    this.layerTexturesCount[index] = count;
};

LayeredMaterial.prototype.loadedTexturesCount = function() {
    return this.texturesCount[l_ELEVATION] + this.texturesCount[l_COLOR];
};

LayeredMaterial.prototype.downScaledColorLayer = function(layer,level) {
    return this.Textures[l_COLOR][this.getLayerTextureOffset(layer)].level < level;
};

LayeredMaterial.prototype.downScaledLayer = function(layerType,level) {

    if (layerType === l_ELEVATION) {
        if (this.Textures[l_ELEVATION][0].level < 0) {
            return false;
        } else {
            return this.Textures[l_ELEVATION][0].level < level;
        }
    } else if (layerType === l_COLOR) {
        for (var index = 0, max = this.colorLayersId.length; index < max; index++) {
            let offset = this.getTextureOffsetByLayerIndex(index);
            if (this.Textures[l_COLOR][offset].level < level) {
                return true;
            }
        }
    }

    return false;
};

LayeredMaterial.prototype.getColorLayerLevel = function(colorLayerId) {

    let index = this.indexOfColorLayer(colorLayerId);
    if(index ===-1) {
        index = 0;
    }
    let slot = this.getTextureOffsetByLayerIndex(index);
    let level = this.Textures[l_COLOR][slot].level;

    return level;
};

LayeredMaterial.prototype.getElevationLayerLevel = function() {
    return this.Textures[l_ELEVATION][0].level;
};

LayeredMaterial.prototype.getLayerLevel = function(layerType,layer) {

    if(layerType == l_ELEVATION) {
        return this.getElevationLayerLevel();
    } else {
        return this.getColorLayerLevel(layer);
    }
};

export default LayeredMaterial;
