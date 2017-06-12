/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import BasicMaterial from './BasicMaterial';
import MatteIdsFS from './Shader/MatteIdsFS.glsl';
import TileDepthVS from './Shader/TileDepthVS.glsl';

export function unpack1K(color, factor) {
    var bitSh = new THREE.Vector4(
        1.0 / (256.0 * 256.0 * 256.0),
        1.0 / (256.0 * 256.0),
        1.0 / 256.0,
        1.0);
    return bitSh.dot(color) * factor;
}


// This material renders the id in RGBA Color
// Warning the RGBA contains id in float pack in 4 unsigned char

const MatteIdsMaterial = function MatteIdsMaterial(otherMaterial) {
    BasicMaterial.call(this);

    this.vertexShader = this.vertexShaderHeader + TileDepthVS;
    this.fragmentShader = this.fragmentShaderHeader + MatteIdsFS;

    this.uniforms.uuid.value = otherMaterial.uniforms.uuid.value;
    this.uniforms.diffuseColor.value = new THREE.Color(Math.random() * 0xffffff);// .setHex( Math.random() * 0xffffff );

    this.uniforms.dTextures_00 = new THREE.Uniform(otherMaterial.textures[0]);
    this.uniforms.texturesCount = new THREE.Uniform(otherMaterial.loadedTexturesCount[0]);
    this.uniforms.offsetScale_L00 = new THREE.Uniform(otherMaterial.offsetScale[0]);
};

MatteIdsMaterial.prototype = Object.create(BasicMaterial.prototype);
MatteIdsMaterial.prototype.constructor = MatteIdsMaterial;

export default MatteIdsMaterial;
