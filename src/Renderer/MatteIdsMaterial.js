/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import BasicMaterial from 'Renderer/BasicMaterial';
import MatteIdsFS from 'Renderer/Shader/MatteIdsFS.glsl';
import GlobeDepthVS from 'Renderer/Shader/GlobeDepthVS.glsl';

// This material renders the id in RGBA Color
// Warning the RGBA contains id in float pack in 4 unsigned char

var MatteIdsMaterial = function (otherMaterial) {
    BasicMaterial.call(this);

    this.vertexShader = this.vertexShaderHeader + GlobeDepthVS;
    this.fragmentShader = this.fragmentShaderHeader + MatteIdsFS;

    this.uniforms.uuid.value = otherMaterial.uniforms.uuid.value;
    this.uniforms.diffuseColor.value = new THREE.Color(Math.random() * 0xffffff);// .setHex( Math.random() * 0xffffff );

    this.uniforms.dTextures_00 = new THREE.Uniform(otherMaterial.textures[0]);
    this.uniforms.texturesCount = new THREE.Uniform(otherMaterial.loadedTexturesCount[0]);
    this.uniforms.offsetScale_L00 = new THREE.Uniform(otherMaterial.offsetScale[0]);
};

MatteIdsMaterial.prototype = Object.create(BasicMaterial.prototype);
MatteIdsMaterial.prototype.constructor = MatteIdsMaterial;

MatteIdsMaterial.prototype.setMatrixRTC = function (rtc) {
    this.uniforms.mVPMatRTC.value = rtc;
};

export default MatteIdsMaterial;
