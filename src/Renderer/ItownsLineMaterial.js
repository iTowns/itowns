/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import THREE from 'THREE';
import BasicMaterial from 'Renderer/BasicMaterial';
import LineVS from 'Renderer/Shader/LineVS.glsl';
import LineFS from 'Renderer/Shader/LineFS.glsl';

var ItownsLineMaterial = function(options) {
        BasicMaterial.call(this);

        if(options === undefined)
                     throw new Error("options is required");


        this.vertexShader = LineVS;
        this.fragmentShader = LineFS;

        this.wireframe = false;

        var texture = new THREE.TextureLoader().load( options.texture );

        this.uniforms.time =  { value: options.time };
        this.uniforms.THICKNESS   = { value: options.linewidth};
        this.uniforms.MITER_LIMIT = { value: 1.0 };
        this.uniforms.WIN_SCALE = { value: new THREE.Vector2(window.innerWidth,window.innerHeight) };
        this.uniforms.texture = { type: "t", value: texture };
        this.uniforms.useTexture = { value: options.useTexture};
        this.uniforms.opacity = { type: "f", value: options.opacity};
        this.uniforms.sizeAttenuation = { type: 'f', value: options.sizeAttenuation};
        this.uniforms.color = {type: 'v3', value: options.color};

        this.transparent = true;
};

ItownsLineMaterial.prototype = Object.create(BasicMaterial.prototype);
ItownsLineMaterial.prototype.constructor = ItownsLineMaterial;

export default ItownsLineMaterial;

