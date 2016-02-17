/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import NodeMesh from 'Renderer/NodeMesh';
import THREE from 'THREE';
import gfxEngine from 'Renderer/c3DEngine';
import WMS_Provider from 'Core/Commander/Providers/WMS_Provider';
import CloudsFS from 'Renderer/Shader/CloudsFS.glsl';
import CloudsVS from 'Renderer/Shader/CloudsVS.glsl';

function Clouds(size) {

    NodeMesh.call(this);

    this.providerWMS = new WMS_Provider({});
    this.loader = new THREE.TextureLoader();
    this.loader.crossOrigin = '';
    this.live = false;

    this.geometry = new THREE.SphereGeometry(6400000, 96, 96);

    this.uniforms = {
        diffuse: {
            type: "t",
            value: this.loader.load("http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=256&height=128")
        },
        time: {
            type: "f",
            value: 0.
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


Clouds.prototype.generate = function() {

    this.live = true;
    var coWMS = {
        latBound: new THREE.Vector2(-85, 85),
        longBound: new THREE.Vector2(-178, 178),
        width: 2048,
        height: 1024
    };


    var url = this.providerWMS.urlGlobalIR(coWMS, 0);
    this.loader.load(url, function(texture) {
        this.material.uniforms.diffuse.value = texture;
        this.material.uniforms.diffuse.needsUpdate = true;
        this.animate();
    }.bind(this));



};

Clouds.prototype.animate = function() {

    this.material.uniforms.time.value += 0.01;
    requestAnimationFrame(this.animate.bind(this));
};

export default Clouds;
