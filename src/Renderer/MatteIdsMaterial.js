/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/MatteIdsMaterial', ['THREE',
    'Renderer/BasicMaterial',
    'Core/System/JavaTools',
    'Renderer/Shader/MatteIdsFS.glsl',
    'Renderer/Shader/GlobeDepthVS.glsl'
], function(
    THREE,
    BasicMaterial,
    JavaTools,
    MatteIdsFS,
    GlobeDepthVS) {

    // This material renders the id in RGBA Color
    // Warning the RGBA contains id in float pack in 4 unsigned char

    var MatteIdsMaterial = function(otherMaterial) {

        BasicMaterial.call(this);

        this.vertexShader =  GlobeDepthVS;
        this.fragmentShader = MatteIdsFS;

        this.uniforms.uuid.value = otherMaterial.uniforms.uuid.value;

        this.uniforms.diffuseColor.value = new THREE.Color( Math.random() * 0xffffff  );//.setHex( Math.random() * 0xffffff );

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

    MatteIdsMaterial.prototype = Object.create(BasicMaterial.prototype);
    MatteIdsMaterial.prototype.constructor = MatteIdsMaterial;

    MatteIdsMaterial.prototype.setMatrixRTC = function(rtc) {
        this.uniforms.mVPMatRTC.value = rtc;
    };

    return MatteIdsMaterial;
});
