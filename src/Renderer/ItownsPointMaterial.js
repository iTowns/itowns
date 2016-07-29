import THREE from 'THREE';
import BasicMaterial from 'Renderer/BasicMaterial';
import PointVS from 'Renderer/Shader/PointVS.glsl';
import PointFS from 'Renderer/Shader/PointFS.glsl';

var ItownsPointMaterial = function(options) {
    BasicMaterial.call(this);

    if(options === undefined)
                 throw new Error("options is required");


    this.vertexShader = PointVS;
    this.fragmentShader = PointFS;

    var texture = new THREE.TextureLoader().load( options.texture );

    this.uniforms.time =  { value: options.time };
    this.uniforms.useTexture = {value: options.useTexture};
    this.uniforms.texture = { type: "t", value: texture };
    this.uniforms.color = {type: 'v3', value: options.color};
    this.uniforms.opacity = {type: 'f', value: options.opacity};
    this.uniforms.resolution = { value: new THREE.Vector2(window.innerWidth,window.innerHeight) };
    this.transparent = true;
};

ItownsPointMaterial.prototype = Object.create(BasicMaterial.prototype);
ItownsPointMaterial.prototype.constructor = ItownsPointMaterial;

export default ItownsPointMaterial;
