/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/BasicMaterial', ['THREE',
    'Core/defaultValue',
    'Renderer/Shader/SimpleVS.glsl',
    'Renderer/Shader/SimpleFS.glsl'
], function(
    THREE,
    defaultValue,
    SimpleVS,
    SimpleFS) {

    function BasicMaterial(color) {
        //Constructor

        THREE.RawShaderMaterial.call(this);

        this.vertexShader = SimpleVS;
        this.fragmentShader = SimpleFS;
        this.transparent = true;
        this.uniforms = {
            diffuseColor: {
                type: "c",
                value: defaultValue(color, new THREE.Color())
            },
            RTC: {
                type: "i",
                value: 1
            },
            mVPMatRTC: {
                type: "m4",
                value: new THREE.Matrix4()
            },
            distanceFog: {
                type: "f",
                value: 1000000000.0
            },
            uuid: {
                type: "i",
                value: 0
            },
            debug: {
                type: "i",
                value: false
            },
            selected: {
                type: "i",
                value: false
            },
            lightOn: {
                type: "i",
                value: true
            }

        };
    }

    BasicMaterial.prototype = Object.create(THREE.RawShaderMaterial.prototype);
    BasicMaterial.prototype.constructor = BasicMaterial;

    BasicMaterial.prototype.enableRTC = function(enable) {
        this.uniforms.RTC.value = enable === true ? 1 : 0;
    };

    BasicMaterial.prototype.setDebug = function(debug_value) {
        this.uniforms.debug.value = debug_value;
    };

    BasicMaterial.prototype.setMatrixRTC = function(rtc) {
        this.uniforms.mVPMatRTC.value = rtc;
    };

    BasicMaterial.prototype.setUuid = function(uuid) {
        this.uniforms.uuid.value = uuid;
    };

    BasicMaterial.prototype.setFogDistance = function(df) {
        this.uniforms.distanceFog.value = df;
    };

    BasicMaterial.prototype.setSelected = function(selected) {
        this.uniforms.selected.value = selected;
    };

    return BasicMaterial;

});
