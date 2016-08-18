import BasicMaterial from 'Renderer/BasicMaterial';
import GlobeDepthFS from 'Renderer/Shader/GlobeDepthFS.glsl';

var BasicDepthMaterial = function() {

    BasicMaterial.call(this);

//    this.vertexShader = DepthVS;
    this.fragmentShader = this.fragmentShaderHeader + GlobeDepthFS;
};

BasicDepthMaterial.prototype = Object.create(BasicMaterial.prototype);
BasicDepthMaterial.prototype.constructor = BasicDepthMaterial;

export default BasicDepthMaterial;
