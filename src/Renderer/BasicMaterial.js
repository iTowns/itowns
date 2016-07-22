/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';
import SimpleVS from 'Renderer/Shader/SimpleVS.glsl';
import SimpleFS from 'Renderer/Shader/SimpleFS.glsl';

function BasicMaterial(color) {
    //Constructor

    THREE.RawShaderMaterial.call(this);

    this.vertexShader = SimpleVS;
    this.fragmentShader = SimpleFS;

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

BasicMaterial.prototype.getMatrixRTC = function() {
    return this.uniforms.mVPMatRTC.value;
};

BasicMaterial.prototype.setUuid = function(uuid) {

    this.uniforms.uuid.value = uuid;
};

BasicMaterial.prototype.getUuid = function() {

    return this.uniforms.uuid.value;
};

BasicMaterial.prototype.setFogDistance = function(df) {
    this.uniforms.distanceFog.value = df;
};

BasicMaterial.prototype.setSelected = function(selected) {
    this.uniforms.selected.value = selected ? 1 : 0;
};

export default BasicMaterial;
