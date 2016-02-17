/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';
import BasicMaterial from 'Renderer/BasicMaterial';
import JavaTools from 'Core/System/JavaTools';
import DepthVS from 'Renderer/Shader/DepthVS.glsl';
import DepthFS from 'Renderer/Shader/DepthFS.glsl';

var DepthMaterial = function() {

    BasicMaterial.call(this);

    this.vertexShader = DepthVS;
    this.fragmentShader = DepthFS;

    this.wireframe = false;
    //this.wireframe = true;

};

DepthMaterial.prototype = Object.create(BasicMaterial.prototype);
DepthMaterial.prototype.constructor = DepthMaterial;

export default DepthMaterial;
