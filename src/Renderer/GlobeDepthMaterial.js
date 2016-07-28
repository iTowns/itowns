import BasicMaterial from 'Renderer/BasicMaterial';
import GlobeDepthFS from 'Renderer/Shader/GlobeDepthFS.glsl';
import GlobeDepthVS from 'Renderer/Shader/GlobeDepthVS.glsl';

var GlobeDepthMaterial = function(otherMaterial) {

    BasicMaterial.call(this);

    this.vertexShader = this.vertexShaderHeader + GlobeDepthVS;
    this.fragmentShader = this.fragmentShaderHeader + GlobeDepthFS;

    // Why connect directily uniform doesn't work?
    // Verify attributes's shaders

    this.uniforms.dTextures_00 = {
        type: "tv",
        value: otherMaterial.Textures[0]
    };

    this.uniforms.nbTextures = {
        type: "i",
        value: otherMaterial.nbTextures[0]
    };

    this.uniforms.pitScale_L00 = {
        type: "v3v",
        value: otherMaterial.pitScale[0]
    };
};

GlobeDepthMaterial.prototype = Object.create(BasicMaterial.prototype);
GlobeDepthMaterial.prototype.constructor = GlobeDepthMaterial;

export default GlobeDepthMaterial;
