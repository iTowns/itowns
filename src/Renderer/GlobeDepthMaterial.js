import * as THREE from 'three';
import BasicMaterial from 'Renderer/BasicMaterial';
import GlobeDepthFS from 'Renderer/Shader/GlobeDepthFS.glsl';
import GlobeDepthVS from 'Renderer/Shader/GlobeDepthVS.glsl';

var GlobeDepthMaterial = function (otherMaterial) {
    BasicMaterial.call(this);

    this.vertexShader = this.vertexShaderHeader + GlobeDepthVS;
    this.fragmentShader = this.fragmentShaderHeader + GlobeDepthFS;

    // Why connect directily uniform doesn't work?
    // Verify attributes's shaders

    this.uniforms.dTextures_00 = new THREE.Uniform(otherMaterial.textures[0]);
    this.uniforms.texturesCount = new THREE.Uniform(otherMaterial.loadedTexturesCount[0]);
    this.uniforms.offsetScale_L00 = new THREE.Uniform(otherMaterial.offsetScale[0]);
};

GlobeDepthMaterial.prototype = Object.create(BasicMaterial.prototype);
GlobeDepthMaterial.prototype.constructor = GlobeDepthMaterial;

export default GlobeDepthMaterial;
