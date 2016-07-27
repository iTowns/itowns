/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import NodeMesh from 'Renderer/NodeMesh';
import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';
import WMS_Provider from 'Core/Commander/Providers/WMS_Provider';
import CloudsFS from 'Renderer/Shader/CloudsFS.glsl';
import CloudsVS from 'Renderer/Shader/CloudsVS.glsl';

function Clouds( /*size*/ ) {

    NodeMesh.call(this);

    this.providerWMS = new WMS_Provider({});
    this.loader = new THREE.TextureLoader();
    this.loader.crossOrigin = '';
    this.live = false;
    this.satelliteAnimation = true;
    this.texture = null;
    this.geometry = new THREE.SphereGeometry(6400000, 96, 96);

    this.uniforms = {
        diffuse: {
            type: "t",
            value: new THREE.Texture() //this.loader.load("http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=256&height=128")
        },
        time: {
            type: "f",
            value: 0.
        },
        lightingOn: {
            type: "i",
            value: 0
        },
        lightPosition: {
            type: "v3",
            value: defaultValue.lightingPos.clone().normalize()
        }
    };


    this.material = new THREE.ShaderMaterial({

        uniforms: this.uniforms,
        vertexShader: CloudsVS,
        fragmentShader: CloudsFS,
        //   blending        : THREE.AdditiveBlending,
        transparent: true,
        wireframe: false

    });

    this.rotation.y += Math.PI;

    //this.generate();

    this.visible = false;


}

Clouds.prototype = Object.create(NodeMesh.prototype);
Clouds.prototype.constructor = Clouds;


Clouds.prototype.generate = function(satelliteAnimation) {

    this.satelliteAnimation = satelliteAnimation;
    if (!satelliteAnimation) {
        this.live = true;
        var coWMS = {
            latBound: new THREE.Vector2(-85, 85),
            longBound: new THREE.Vector2(-178, 178),
            width: 2048,
            height: 1024
        };

        var url = this.providerWMS.urlGlobalIR(coWMS, 0);
        this.loader.load(url, function(texture) {
            this.material.blending = THREE.NormalBlending;
            this.material.uniforms.diffuse.value = texture;
            this.material.uniforms.diffuse.needsUpdate = true;
            this.animate();
        }.bind(this));

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



Clouds.prototype.animate = function() {

    if (!this.satelliteAnimation) this.material.uniforms.time.value += 0.01;
    requestAnimationFrame(this.animate.bind(this));
};

Clouds.prototype.setLightingOn = function(enable) {
    this.material.uniforms.lightingOn.value = enable === true ? 1 : 0;
};

Clouds.prototype.updateLightingPos = function(pos) {

    this.material.uniforms.lightPosition.value = pos.clone().normalize();
};

export default Clouds;
