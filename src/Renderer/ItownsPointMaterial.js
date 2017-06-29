import * as THREE from 'three';
import PointVS from './Shader/PointVS.glsl';
import PointFS from './Shader/PointFS.glsl';

const ItownsPointMaterial = function ItownsPointMaterial(options) {
    THREE.RawShaderMaterial.call(this);

    if (options === undefined)
                 { throw new Error('options is required'); }


    this.vertexShader = PointVS;
    this.fragmentShader = PointFS;

    var texture = new THREE.TextureLoader().load(options.texture);

    this.uniforms.time = { value: options.time };
    this.uniforms.useTexture = { value: options.useTexture };
    this.uniforms.texture = { type: 't', value: texture };
    this.uniforms.color = { type: 'v3', value: options.color };
    this.uniforms.opacity = { type: 'f', value: options.opacity };
    this.uniforms.resolution = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) };
    this.transparent = true;
};

ItownsPointMaterial.prototype = Object.create(THREE.RawShaderMaterial.prototype);
ItownsPointMaterial.prototype.constructor = ItownsPointMaterial;

export default ItownsPointMaterial;
