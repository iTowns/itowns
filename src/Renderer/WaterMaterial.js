/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';
import BasicMaterial from 'Renderer/BasicMaterial';
import gfxEngine from 'Renderer/c3DEngine';
import JavaTools from 'Core/System/JavaTools';
import GlobeVS from 'Renderer/Shader/WaterVS.glsl';
import GlobeFS from 'Renderer/Shader/WaterFS.glsl';
import pitUV from 'Renderer/Shader/Chunk/pitUV.glsl';


var WaterMaterial = function(id) {

    BasicMaterial.call(this);

    this.vertexShader = WaterVS;
    this.fragmentShader = WaterFS;


    var waterNormals = new THREE.TextureLoader('../data/water/waternormals.jpg');
    var mask         = new THREE.TextureLoader('../data/water/wmts.png');
              
    var mirroir = new THREE.WebGLRenderTarget(width, height);
              
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; 
                
                
    this.uniforms.normalSampler = { type: "t", value: waterNormals};
    this.uniforms.mirrorSampler = { type: "t", value: mirroir};
    this.uniforms.maskSampler  =  { type: "t", value: mask};
    this.uniforms.alpha  =  { type: "f", value: 1.0 };
    this.uniforms.time =  { type: "f", value: 0.0 };
    this.uniforms.distortionScale = { type: "f", value: 20.0 };
    this.uniforms.noiseScale =  { type: "f", value: 1.0 };
    this.uniforms.textureMatrix =  { type: "m4", value: new THREE.Matrix4() };
    this.uniforms.sunColor =  { type: "c", value: new THREE.Color(0x7F7F7F) };
    this.uniforms.sunDirection = { type: "v3", value: new THREE.Vector3(0.70707, 0.70707, 0)};
    this.uniforms.eye = { type: "v3", value: new THREE.Vector3(0, 0, 0)};
    this.uniforms.waterColor = { type: "c", value: new THREE.Color(0x555555)};
  

    this.setUuid(id || 0);
    this.wireframe = false;

};

WaterMaterial.prototype = Object.create(WaterMaterial.prototype);
WaterMaterial.prototype.constructor = WaterMaterial;



WaterMaterial.prototype.setTexture = function(texture, layer, slot, pitScale) {

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



export default WaterMaterial;


