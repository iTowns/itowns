import * as THREE from 'three';
import BasicMaterial from './BasicMaterial';
import Fetcher from '../Core/Commander/Providers/Fetcher';
import PointVS from './Shader/PointVS.glsl';
import PointFS from './Shader/PointFS.glsl';

const ItownsPointMaterial = function ItownsPointMaterial(options) {
    BasicMaterial.call(this);

    if (options === undefined)
                 { throw new Error('options is required'); }


    this.vertexShader = PointVS;
    this.fragmentShader = PointFS;

    const texture = options.texture ? Fetcher.texture.load(options.texture) : undefined;

    this.uniforms.time = { value: options.time };
    this.uniforms.useTexture = { value: options.useTexture };
    this.uniforms.texture = { value: texture };
    this.uniforms.color = { value: options.color };
    this.uniforms.opacity = { value: options.opacity };
    this.uniforms.resolution = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) };
    this.transparent = true;
};

ItownsPointMaterial.prototype = Object.create(BasicMaterial.prototype);
ItownsPointMaterial.prototype.constructor = ItownsPointMaterial;

export default ItownsPointMaterial;

