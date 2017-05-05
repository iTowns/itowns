/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import WMS_Provider from '../Core/Commander/Providers/WMS_Provider';
import CloudsFS from '../Renderer/Shader/CloudsFS.glsl';
import CloudsVS from '../Renderer/Shader/CloudsVS.glsl';
import { LIGHTING_POSITION } from './Atmosphere';

function Clouds(/* size*/) {
    THREE.Mesh.call(this);

    this.providerWMS = new WMS_Provider({});
    this.loader = new THREE.TextureLoader();
    this.loader.crossOrigin = '';
    this.live = false;
    this.satelliteAnimation = true;
    this.texture = null;
    this.geometry = new THREE.SphereGeometry(6400000, 96, 96);

    this.uniforms = {
        diffuse: {
            type: 't',
            value: new THREE.Texture(), // this.loader.load("http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=256&height=128")
        },
        time: {
            type: 'f',
            value: 0.0,
        },
        lightingEnabled: { value: false },
        lightPosition: {
            type: 'v3',
            value: LIGHTING_POSITION.clone().normalize(),
        },
    };


    this.material = new THREE.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: CloudsVS,
        fragmentShader: CloudsFS,
        //   blending        : THREE.AdditiveBlending,
        transparent: true,
        wireframe: false,

    });

    this.rotation.y += Math.PI;

    // this.generate();

    this.visible = false;
}

Clouds.prototype = Object.create(THREE.Mesh.prototype);
Clouds.prototype.constructor = Clouds;


Clouds.prototype.generate = function generate(satelliteAnimation) {
    this.satelliteAnimation = satelliteAnimation;
    if (!satelliteAnimation) {
        this.live = true;
        var coWMS = {
            latBound: new THREE.Vector2(-85, 85),
            longBound: new THREE.Vector2(-178, 178),
            width: 2048,
            height: 1024,
        };

        var url = this.providerWMS.urlGlobalIR(coWMS, 0);
        this.loader.load(url, (texture) => {
            this.material.blending = THREE.NormalBlending;
            this.material.uniforms.diffuse.value = texture;
            this.material.uniforms.diffuse.needsUpdate = true;
            this.animate();
        });
    } else {
        this.live = true;
        var video = document.getElementById('video');

        this.texture = new THREE.VideoTexture(video);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.format = THREE.RGBFormat;

        // this.material = new THREE.MeshBasicMaterial( { color: 0xffffff, map: this.texture});//, transparent : true, opacity:0.8});
        this.material.blending = THREE.AdditiveBlending;
        this.material.uniforms.diffuse.value = this.texture;
        this.material.uniforms.diffuse.needsUpdate = true;
        this.animate();
    }
};


Clouds.prototype.animate = function animate() {
    if (!this.satelliteAnimation) this.material.uniforms.time.value += 0.01;
    requestAnimationFrame(this.animate.bind(this));
};

Clouds.prototype.setLightingOn = function setLightingOn(enable) {
    this.material.uniforms.lightingEnabled.value = enable;
};

Clouds.prototype.updateLightingPos = function updateLightingPos(pos) {
    this.material.uniforms.lightPosition.value = pos.clone().normalize();
};

export default Clouds;
