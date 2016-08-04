/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';
import c3DEngine from 'Renderer/c3DEngine';
import SimpleVS from 'Renderer/Shader/SimpleVS.glsl';
import SimpleFS from 'Renderer/Shader/SimpleFS.glsl';
import LogDepthBuffer from 'Renderer/Shader/Chunk/LogDepthBuffer.glsl';

function BasicMaterial(color) {
    //Constructor

    THREE.RawShaderMaterial.call(this);

    this.vertexShaderHeader = '';
    this.fragmentShaderHeader = '';

    var logarithmicDepthBuffer = c3DEngine().renderer.capabilities.logarithmicDepthBuffer;

    if(logarithmicDepthBuffer)
    {
        this.fragmentShaderHeader += '#extension GL_EXT_frag_depth : enable\n';
    }

    this.fragmentShaderHeader +='precision highp float;\n';
    this.fragmentShaderHeader +='precision highp int;\n';


    if(logarithmicDepthBuffer)
    {
        this.fragmentShaderHeader +='#define USE_LOGDEPTHBUF\n';
        this.fragmentShaderHeader +='#define USE_LOGDEPTHBUF_EXT\n';
		this.fragmentShaderHeader += LogDepthBuffer;
    }

	this.fragmentShaderHeader +='#define VERTEX_TEXTURES\n';
	this.vertexShaderHeader = this.fragmentShaderHeader;

	this.vertexShader = this.vertexShaderHeader + SimpleVS;
	this.fragmentShader = this.fragmentShaderHeader + SimpleFS;

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
