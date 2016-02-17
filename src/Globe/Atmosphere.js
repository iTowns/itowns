/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import NodeMesh from 'Renderer/NodeMesh';
import THREE from 'THREE';
import GlowFS from 'Renderer/Shader/GlowFS.glsl';
import GlowVS from 'Renderer/Shader/GlowVS.glsl';

function Atmosphere(size) {

    NodeMesh.call(this);

    this.uniformsOut = {
        atmoIN: {
            type: "i",
            value: 0
        },
        screenSize: {
            type: "v2",
            value: new THREE.Vector2(window.innerWidth, window.innerHeight)
        } // Should be updated on screen resize...
    };

    this.material = new THREE.ShaderMaterial({

        uniforms: this.uniformsOut,
        vertexShader: GlowVS,
        fragmentShader: GlowFS,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        wireframe: false

    });

    this.geometry = new THREE.SphereGeometry(size.x * 1.14, 128, 128);

    this.uniformsIn = {
        atmoIN: {
            type: "i",
            value: 1
        },
        screenSize: {
            type: "v2",
            value: new THREE.Vector2(window.innerWidth, window.innerHeight)
        } // Should be updated on screen resize...
    };

    var materialAtmoIn = new THREE.ShaderMaterial({

        uniforms: this.uniformsIn,
        vertexShader: GlowVS,
        fragmentShader: GlowFS,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true

    });

    var atmosphereIN = new THREE.Mesh(new THREE.SphereGeometry(size.x * 1.002, 64, 64), materialAtmoIn);

    this.add(atmosphereIN);

}

Atmosphere.prototype = Object.create(NodeMesh.prototype);

Atmosphere.prototype.constructor = Atmosphere;

export default Atmosphere;
