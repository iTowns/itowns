import * as THREE from 'three';
import BasicMaterial from './BasicMaterial';
import TileDepthFS from './Shader/TileDepthFS.glsl';
import TileDepthVS from './Shader/TileDepthVS.glsl';

const TileDepthMaterial = function TileDepthMaterial(otherMaterial) {
    BasicMaterial.call(this);

    this.vertexShader = this.vertexShaderHeader + TileDepthVS;
    this.fragmentShader = this.fragmentShaderHeader + TileDepthFS;

    // Why connect directily uniform doesn't work?
    // Verify attributes's shaders

    this.uniforms.dTextures_00 = new THREE.Uniform(otherMaterial.textures[0]);
    this.uniforms.texturesCount = new THREE.Uniform(otherMaterial.loadedTexturesCount[0]);
    this.uniforms.offsetScale_L00 = new THREE.Uniform(otherMaterial.offsetScale[0]);
};

TileDepthMaterial.prototype = Object.create(BasicMaterial.prototype);
TileDepthMaterial.prototype.constructor = TileDepthMaterial;

export default TileDepthMaterial;
