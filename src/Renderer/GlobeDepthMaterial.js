
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

    return GlobeDepthMaterial;
});
