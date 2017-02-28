/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import c3DEngine from './c3DEngine';
import BasicMaterial from './BasicMaterial';
import Fetcher from '../Core/Commander/Providers/Fetcher';
import LineVS from './Shader/LineVS.glsl';
import LineFS from './Shader/LineFS.glsl';

const LineMaterial = function LineMaterial(options) {
    BasicMaterial.call(this);

    if (options === undefined) {
        throw new Error('options is required');
    }

    this.fragmentShader = this.fragmentShaderHeader + LineFS;
    this.vertexShader = this.vertexShaderHeader + LineVS;

    this.wireframe = false;

    const texture = options.texture ? Fetcher.texture(options.texture) : undefined;

    this.uniforms.THICKNESS = { value: options.linewidth };
    this.uniforms.MITER_LIMIT = { value: 1.0 };
    this.uniforms.WIN_SCALE = { value: c3DEngine().viewerDiv.size };
    if (texture) {
        this.uniforms.texture = { value: texture };
    }
    this.uniforms.useTexture = { value: texture ? options.useTexture : false };
    this.uniforms.opacity = { value: options.opacity };
    this.uniforms.sizeAttenuation = { value: options.sizeAttenuation };
    this.uniforms.color = { value: options.color };
    this.transparent = true;
};

LineMaterial.prototype = Object.create(BasicMaterial.prototype);
LineMaterial.prototype.constructor = LineMaterial;

export default LineMaterial;

