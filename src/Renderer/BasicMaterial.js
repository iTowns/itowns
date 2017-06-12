/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import SimpleVS from './Shader/SimpleVS.glsl';
import SimpleFS from './Shader/SimpleFS.glsl';
import LogDepthBuffer from './Shader/Chunk/LogDepthBuffer.glsl';
import Capabilities from '../Core/System/Capabilities';

function BasicMaterial(color) {
    // Constructor

    THREE.RawShaderMaterial.call(this);

    this.vertexShaderHeader = '';
    this.fragmentShaderHeader = '';

    var logarithmicDepthBuffer = Capabilities.isLogDepthBufferSupported();

    if (logarithmicDepthBuffer)
    {
        this.fragmentShaderHeader += '#extension GL_EXT_frag_depth : enable\n';
    }

    this.fragmentShaderHeader += 'precision highp float;\n';
    this.fragmentShaderHeader += 'precision highp int;\n';


    if (logarithmicDepthBuffer)
    {
        this.fragmentShaderHeader += '#define USE_LOGDEPTHBUF\n';
        this.fragmentShaderHeader += '#define USE_LOGDEPTHBUF_EXT\n';
        this.fragmentShaderHeader += LogDepthBuffer;
    }

    this.fragmentShaderHeader += '#define VERTEX_TEXTURES\n';
    this.vertexShaderHeader = this.fragmentShaderHeader;

    this.vertexShader = this.vertexShaderHeader + SimpleVS;
    this.fragmentShader = this.fragmentShaderHeader + SimpleFS;

    this.uniforms = {
        diffuseColor: { value: color || new THREE.Color() },
        distanceFog: { value: 1000000000.0 },
        uuid: { value: 0 },
        debug: { value: false },
        selected: { value: false },
        lightingEnabled: { value: false },
    };
}

BasicMaterial.prototype = Object.create(THREE.RawShaderMaterial.prototype);
BasicMaterial.prototype.constructor = BasicMaterial;

BasicMaterial.prototype.setDebug = function setDebug(v) {
    this.uniforms.debug.value = v;
};

BasicMaterial.prototype.setUuid = function setUuid(uuid) {
    this.uniforms.uuid.value = uuid;
};

BasicMaterial.prototype.getUuid = function getUuid() {
    return this.uniforms.uuid.value;
};

BasicMaterial.prototype.setFogDistance = function setFogDistance(df) {
    this.uniforms.distanceFog.value = df;
};

BasicMaterial.prototype.setSelected = function setSelected(selected) {
    this.uniforms.selected.value = selected;
};

export default BasicMaterial;
