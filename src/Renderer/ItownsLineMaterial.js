/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import * as THREE from 'three';
import BasicMaterial from './BasicMaterial';
import Fetcher from '../Core/Commander/Providers/Fetcher';
import LineVS from './Shader/LineVS.glsl';
import LineFS from './Shader/LineFS.glsl';

const ItownsLineMaterial = function ItownsLineMaterial(options) {
    BasicMaterial.call(this);

    if (options === undefined) {
        throw new Error('options is required');
    }

    this.fragmentShader = this.fragmentShaderHeader + LineFS;
    this.vertexShader = this.vertexShaderHeader + LineVS;

    this.wireframe = false;

    const texture = options.texture ? Fetcher.texture.load(options.texture) : undefined;

    this.uniforms.THICKNESS = { value: options.linewidth };
    this.uniforms.MITER_LIMIT = { value: true };
    this.uniforms.WIN_SCALE = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) };
    if (texture) {
        this.uniforms.texture = { value: texture };
    }
    this.uniforms.useTexture = { value: texture ? options.useTexture : false };
    this.uniforms.opacity = { value: options.opacity };
    this.uniforms.sizeAttenuation = { value: options.sizeAttenuation };
    this.uniforms.color = { value: options.color };
    this.transparent = true;
};

ItownsLineMaterial.prototype = Object.create(BasicMaterial.prototype);
ItownsLineMaterial.prototype.constructor = ItownsLineMaterial;

export default ItownsLineMaterial;

