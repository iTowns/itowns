/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import BasicMaterial from 'Renderer/BasicMaterial';
import MatteIdsFS from 'Renderer/Shader/MatteIdsFS.glsl';

// This material renders the id in RGBA Color
// Warning the RGBA contains id in float pack in 4 unsigned char

var BasicIdsMaterial = function(otherMaterial) {

    BasicMaterial.call(this);

    //this.vertexShader = DepthVS;
    this.fragmentShader = this.fragmentShaderHeader + '#define MULTIPLE_GEOMETRIES\n' + MatteIdsFS;

    this.uniforms.uuid.value = otherMaterial.uniforms.uuid.value;

    //this.uniforms.diffuseColor.value = new THREE.Color(Math.random() * 0xffffff); //.setHex( Math.random() * 0xffffff );
};

BasicIdsMaterial.prototype = Object.create(BasicMaterial.prototype);
BasicIdsMaterial.prototype.constructor = BasicIdsMaterial;

BasicIdsMaterial.prototype.setMatrixRTC = function(rtc) {
    this.uniforms.mVPMatRTC.value = rtc;
};

export default BasicIdsMaterial;
