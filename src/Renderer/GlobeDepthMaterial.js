/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/GlobeDepthMaterial', ['THREE',
    'Renderer/BasicMaterial',
    'Core/System/JavaTools',
    'Renderer/Shader/GlobeDepthFS.glsl',
    'Renderer/Shader/GlobeDepthVS.glsl'
], function(
    THREE,
    BasicMaterial,
    JavaTools,
    GlobeDepthFS,
    GlobeDepthVS) {

    var GlobeDepthMaterial = function(otherMaterial) {

        BasicMaterial.call(this);

        this.vertexShader =  GlobeDepthVS;
        this.fragmentShader = GlobeDepthFS;


        // Peut passer directement l'uniform de otherMaterial,
        // vérifier l'homogénéité des déclarations des attributes
        // dans le 2 shaders

        this.uniforms.dTextures_00 = {
            type: "tv",
            value: otherMaterial.Textures[0]
        };

        this.uniforms.nbTextures = {
            type: "iv1",
            value: otherMaterial.nbTextures
        };

        this.uniforms.pitScale_L00 = {
            type: "v3v",
            value: otherMaterial.pitScale[0]
        };
    };

    GlobeDepthMaterial.prototype = Object.create(BasicMaterial.prototype);
    GlobeDepthMaterial.prototype.constructor = GlobeDepthMaterial;

    return GlobeDepthMaterial;
});
