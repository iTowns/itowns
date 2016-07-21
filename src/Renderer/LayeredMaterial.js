/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';
import BasicMaterial from 'Renderer/BasicMaterial';
import gfxEngine from 'Renderer/c3DEngine';
import JavaTools from 'Core/System/JavaTools';
import GlobeVS from 'Renderer/Shader/GlobeVS.glsl';
import GlobeFS from 'Renderer/Shader/GlobeFS.glsl';
import pitUV from 'Renderer/Shader/Chunk/pitUV.glsl';

var emptyTexture = new THREE.Texture();

emptyTexture.level = -1;
var nbLayer = 2;
var vector = new THREE.Vector3(0.0, 0.0, 0.0);
var vector2 = new THREE.Vector2(0.0, 0.0);
var vector4 = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);
var showDebug = false;
var fooTexture;

var getColorAtIdUv = function(nbTex) {

    if (!fooTexture) {
        fooTexture = 'vec4 colorAtIdUv(sampler2D dTextures[TEX_UNITS],vec3 pitScale[TEX_UNITS],int id, vec2 uv){\n';
        fooTexture += ' if (id == 0) return texture2D(dTextures[0],  pitUV(uv,pitScale[0]));\n';

        for (var l = 1; l < nbTex; l++) {

            var sL = l.toString();
            fooTexture += '    else if (id == ' + sL + ') return texture2D(dTextures[' + sL + '],  pitUV(uv,pitScale[' + sL + ']));\n';
        }

        fooTexture += 'else return vec4(0.0,0.0,0.0,0.0);}\n';
    }

    return fooTexture;
}

var LayeredMaterial = function(id) {

    BasicMaterial.call(this);

    var maxTexturesUnits =  gfxEngine().glParams.maxTexturesUnits;
    this.vertexShader = GlobeVS;
    var nbSamplers = Math.min(maxTexturesUnits-1,16-1);

    this.fragmentShaderHeader +='const int   TEX_UNITS   = ' + nbSamplers.toString() + ';\n';
    this.fragmentShaderHeader += pitUV;

    if(showDebug)
        this.fragmentShaderHeader += '#define DEBUG\n';

    this.fragmentShaderHeader += getColorAtIdUv(nbSamplers);

    this.fragmentShader = this.fragmentShaderHeader + GlobeFS;
    this.vertexShader = this.vertexShaderHeader + GlobeVS;

    this.Textures = [];
    this.pitScale = [];
    this.nbTextures = [];

    // Array not suported in IE
    var fill = function(array,remp){

        for(var i=0;i<array.length;i++)
            array[i] = remp;
    };

    // Uniform three js needs no empty array
    for (var l = 0; l < nbLayer; l++) {

        // WARNING TODO prevent empty slot, but it's not the solution
        this.pitScale[l] = Array(nbSamplers);
        fill(this.pitScale[l],vector) ;
        this.nbTextures[l] = 0;
    }

    this.Textures[0] = [emptyTexture];
    this.Textures[1] = Array(nbSamplers);
    this.paramLayers = Array(8);
    this.paramBLayers = Array(8);

    fill(this.Textures[1],emptyTexture);
    fill(this.paramLayers,vector4);
    fill(this.paramBLayers,vector2);

    // Elevation texture
    this.uniforms.dTextures_00 = {
        type: "tv",
        value: this.Textures[0]
    };

    // Color texture
    this.uniforms.dTextures_01 = {
        type: "tv",
        value: this.Textures[1]
    };

    this.uniforms.nbTextures = {
        type: "iv1",
        value: this.nbTextures
    };

    this.uniforms.layerSequence = {
        type: "iv1",
        value: [0, 1, 2, 3, 4, 6, 7, 8]
    };

    this.uniforms.nColorLayer = {
        type: "i",
        value: 1
    };

    // PIT n Textures
    // Projection
    // Visible
    // Opacity

    this.uniforms.paramLayers = {
        type: "v4v",
        value: this.paramLayers
    };

    this.uniforms.paramBLayers = {
        type: "v2v",
        value: this.paramBLayers
    };

    this.uniforms.pitScale_L00 = {
        type: "v3v",
        value: this.pitScale[0]
    };
    this.uniforms.pitScale_L01 = {
        type: "v3v",
        value: this.pitScale[1]
    };
    this.uniforms.lightingOn = {
            type: "i",
            value: gfxEngine().lightingOn
        },
        this.uniforms.lightPosition = {
            type: "v3",
            value: new THREE.Vector3(-0.5, 0.0, 1.0)
        };

    this.setUuid(id || 0);
    this.wireframe = false;
    //this.wireframe = true;

    this.layerIdToIndex = {};
};

LayeredMaterial.prototype = Object.create(BasicMaterial.prototype);
LayeredMaterial.prototype.constructor = LayeredMaterial;

LayeredMaterial.prototype.dispose = function() {

    this.dispatchEvent({
        type: 'dispose'
    });

    for (var l = 0; l < nbLayer; l++)
        for (var i = 0, max = this.Textures[l].length; i < max; i++)
            if (this.Textures[l][i] instanceof THREE.Texture)
                this.Textures[l][i].dispose();

    var jT = new JavaTools();

    jT.freeArray(this.Textures[0]);
    jT.freeArray(this.Textures[1]);

    jT.freeArray(this.uniforms.dTextures_00.value);
    jT.freeArray(this.uniforms.dTextures_01.value);
};

LayeredMaterial.prototype.nbLoadedTextures = function() {

    return this.nbTextures[0] + this.nbTextures[1];
};


LayeredMaterial.prototype.setSequence = function(newSequence) {

    var sequence = this.uniforms.layerSequence.value;
    var max = Math.min(newSequence.length, sequence.length);

    for (var l = 0; l < max; l++)

        sequence[l] = newSequence[l];

};

LayeredMaterial.prototype.removeLayerColor = function(idLayer) {
    var layerIndex = this.layerIdToIndex[idLayer];
    if (!layerIndex) return;

    var startIdTexture = this.paramLayers[layerIndex].x;
    var nbTextures = this.getNbColorTexturesLayer(layerIndex);

    this.paramLayers.splice(layerIndex, 1);
    this.paramBLayers.splice(layerIndex, 1);
    this.paramLayers.push(vector4);
    this.paramBLayers.push(vector2);

    for (var i = startIdTexture, max = startIdTexture + nbTextures; i < max; i++) {
        if (this.Textures[1][i] instanceof THREE.Texture)
            this.Textures[1][i].dispose();
    }

    this.Textures[1].splice(startIdTexture, nbTextures);
    this.uniforms.nColorLayer.value--;

    for (var j = layerIndex, mx = this.paramLayers.length; j < mx; j++)
        this.paramLayers[j].x -= nbTextures;

    // Rebuild sequence
    var sequence = this.uniforms.layerSequence.value;
    var limit = false;

    for (var l = 0; l < this.uniforms.nColorLayer.value; l++) {
        if (limit || sequence[l] === layerIndex) {
            limit = true;
            sequence[l] = sequence[l + 1];
        }

        if (sequence[l] > layerIndex)
            sequence[l]--;
    }

    // fill the end's sequence
    sequence[this.uniforms.nColorLayer.value] = this.uniforms.nColorLayer.value;
    this.layerIdToIndex.idLayer = undefined;
};

LayeredMaterial.prototype.setTexture = function(texture, layer, slot, pitScale) {

    if (this.Textures[layer][slot] === undefined || this.Textures[layer][slot].image === undefined)
        this.nbTextures[layer] += 1;

    // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11
    this.Textures[layer][slot] = texture ? texture : emptyTexture;
    this.pitScale[layer][slot] = pitScale ? pitScale : new THREE.Vector3(0.0, 0.0, 1.0);

    // TEMP
    if (texture === null) {
        var l = this.getIdLayer(slot);
        if (l)
            this.paramLayers[l].z = 0;
    }

};

LayeredMaterial.prototype.getIdLayer = function(slot) {
    for (var l = 0; l < this.paramLayers.length; l++) {
        if (slot === this.paramLayers[l].x)
            return l;
    }
};

LayeredMaterial.prototype.getNbColorTexturesLayer = function(layerIndex) {
    return (this.paramLayers[layerIndex + 1].x || this.nbTextures[1]) - (this.paramLayers[layerIndex].x || 0);
};

LayeredMaterial.prototype.setParam = function(param) {
    this.uniforms.nColorLayer.value = param.length;
    for (var l = 0; l < param.length; l++) {
        this.layerIdToIndex[param[l].idLayer] = l;
        this.paramLayers[l] = new THREE.Vector4(param[l].layerTexturesOffset, param[l].tileMT === 'PM' ? 1 : 0, param[l].visible, param[l].opacity);
        this.paramBLayers[l] = new THREE.Vector2(param[l].fx, 0.0);
    }
};

LayeredMaterial.prototype.getLayerTextureOffset = function(layer) {
    var index = this.layerIdToIndex[layer];
    if (index !== undefined) {
        return this.paramLayers[index].x;
    } else {
        return -1;
    }
};

LayeredMaterial.prototype.setTexturesLayer = function(textures, layer) {

    for (var i = 0, max = textures.length; i < max; i++) {

        if (textures[i])
            this.setTexture(textures[i].texture, layer, i, textures[i].pitch);

    }
};

LayeredMaterial.prototype.getDelta = function() {
    if (this.paramLayers[0])
        // TODO: Fix Me, this function always used 1st layer
        return 0; // this.paramLayers[0].y;
    else
        return 0;

};

LayeredMaterial.prototype.setLightingOn = function(enable) {
    this.uniforms.lightingOn.value = enable === true ? 1 : 0;
};

LayeredMaterial.prototype.setLayerOpacity = function(id, opacity) {

    if (this.paramLayers[id]) {
        this.paramLayers[id].w = opacity;
    }
};

LayeredMaterial.prototype.setLayerVisibility = function(id, visible) {

    if (this.paramLayers[id]) {
        this.paramLayers[id].z = visible ? 1 : 0;
    }
};

LayeredMaterial.prototype.setNbLayersColor = function(n) {
    this.uniforms.nColorLayer.value = n;
};

LayeredMaterial.prototype.getLevelLayerColor = function(id, slot) {

    var level = this.Textures[id][slot || 0].level;

    return level;
};

export default LayeredMaterial;
