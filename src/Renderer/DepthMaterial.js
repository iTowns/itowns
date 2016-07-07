/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/DepthMaterial', ['THREE',
    'Renderer/BasicMaterial',
    'Core/System/JavaTools',
    'Renderer/Shader/DepthVS.glsl',
    'Renderer/Shader/DepthFS.glsl',
    'Renderer/Shader/Depth2FS.glsl'
], function(
    THREE,
    BasicMaterial,
    JavaTools,
    DepthVS,
    DepthFS,
    Depth2FS) {

    var DepthMaterial = function(otherMaterial) {

        BasicMaterial.call(this);

        this.vertexShader =  otherMaterial.vertexShader ||  DepthVS;
        this.fragmentShader = Depth2FS;

        if(otherMaterial)
            this.uniforms = otherMaterial.uniforms;

        this.wireframe = false;
        //this.wireframe = true;

    };

    DepthMaterial.prototype = Object.create(BasicMaterial.prototype);
    DepthMaterial.prototype.constructor = DepthMaterial;

    return DepthMaterial;
});
