import BasicMaterial from 'Renderer/BasicMaterial';
import NormalFS from 'Renderer/Shader/NormalFS.glsl';
import NormalVS from 'Renderer/Shader/NormalVS.glsl';

var BasicNormalMaterial = function() {

    BasicMaterial.call(this);

    this.vertexShader = this.fragmentShaderHeader + NormalVS;
    this.fragmentShader = this.fragmentShaderHeader + NormalFS;
};

BasicNormalMaterial.prototype = Object.create(BasicMaterial.prototype);
BasicNormalMaterial.prototype.constructor = BasicNormalMaterial;

export default BasicNormalMaterial;
