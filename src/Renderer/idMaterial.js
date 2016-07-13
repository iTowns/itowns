/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/idMaterial', ['THREE',
    'Renderer/BasicMaterial',
    'Core/System/JavaTools',
    'Renderer/Shader/idFS.glsl',
    'Renderer/Shader/GlobeDepthVS.glsl'
], function(
    THREE,
    BasicMaterial,
    JavaTools,
    idFS,
    GlobeDepthVS) {

    // This material renders the id in RGBA Color
    // Warning the RGBA contains id in float pack in 4 unsigned char

    var idMaterial = function(otherMaterial) {

        BasicMaterial.call(this);

        this.vertexShader =  GlobeDepthVS;
        this.fragmentShader = idFS;

        this.uniforms.uuid.value = otherMaterial.uniforms.uuid.value;

    };

    idMaterial.prototype = Object.create(BasicMaterial.prototype);
    idMaterial.prototype.constructor = idMaterial;

    return idMaterial;
});
