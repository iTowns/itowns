import BasicMaterial from 'Renderer/BasicMaterial';
import GlobeDepthFS from 'Renderer/Shader/GlobeDepthFS.glsl';
import DepthVS from 'Renderer/Shader/DepthVS.glsl';

var BasicDepthMaterial = function(otherMaterial) {

    BasicMaterial.call(this);

//    this.vertexShader = DepthVS;
    this.fragmentShader = this.fragmentShaderHeader + GlobeDepthFS;
};

BasicDepthMaterial.prototype = Object.create(BasicMaterial.prototype);
BasicDepthMaterial.prototype.constructor = BasicDepthMaterial;

export default BasicDepthMaterial;
