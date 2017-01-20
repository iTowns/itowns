/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import Sky from './SkyShader';
import skyFS from '../Renderer/Shader/skyFS.glsl';
import skyVS from '../Renderer/Shader/skyVS.glsl';
import groundFS from '../Renderer/Shader/groundFS.glsl';
import groundVS from '../Renderer/Shader/groundVS.glsl';
import GlowFS from '../Renderer/Shader/GlowFS.glsl';
import GlowVS from '../Renderer/Shader/GlowVS.glsl';
import { ellipsoidSizes } from '../Core/Geographic/Coordinates';

export const LIGHTING_POSITION = new THREE.Vector3(1, 0, 0);

function Atmosphere() {
    THREE.Mesh.call(this);

    this.realistic = false;
    this.sphereSun = null;

    this.uniformsOut = {
        atmoIN: {
            type: 'i',
            value: 0,
        },
        screenSize: {
            type: 'v2',
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        }, // Should be updated on screen resize...
    };

    var material = new THREE.ShaderMaterial({

        uniforms: this.uniformsOut,
        vertexShader: GlowVS,
        fragmentShader: GlowFS,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        wireframe: false,

    });

    var size = ellipsoidSizes();
    var geometry = (new THREE.SphereGeometry(1.14, 128, 128)).scale(size.x, size.y, size.z);


    this.geometry = geometry;
    this.material = material;

    this.uniformsIn = {
        atmoIN: {
            type: 'i',
            value: 1,
        },
        screenSize: {
            type: 'v2',
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        }, // Should be updated on screen resize...
    };

    var materialAtmoIn = new THREE.ShaderMaterial({

        uniforms: this.uniformsIn,
        vertexShader: GlowVS,
        fragmentShader: GlowFS,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,

    });

    this.atmosphereIN = new THREE.Mesh((new THREE.SphereGeometry(1.002, 64, 64)).scale(size.x, size.y, size.z), materialAtmoIn);

    this.add(this.atmosphereIN);

    var atmosphere = {
        Kr: 0.0025,
        Km: 0.0010,
        ESun: 20.0,
        g: -0.950,
        innerRadius: 6400000,
        outerRadius: 6700000,
        wavelength: [0.650, 0.570, 0.475],
        scaleDepth: 0.25,
        mieScaleDepth: 0.1,
    };

    var uniformsSky = {
        v3LightPosition: { value: LIGHTING_POSITION.clone().normalize() },
        v3InvWavelength: { value: new THREE.Vector3(1 / Math.pow(atmosphere.wavelength[0], 4), 1 / Math.pow(atmosphere.wavelength[1], 4), 1 / Math.pow(atmosphere.wavelength[2], 4)) },
        fCameraHeight: { value: 0.0 },
        fCameraHeight2: { value: 0.0 },
        fInnerRadius: { value: atmosphere.innerRadius },
        fInnerRadius2: { value: atmosphere.innerRadius * atmosphere.innerRadius },
        fOuterRadius: { value: atmosphere.outerRadius },
        fOuterRadius2: { value: atmosphere.outerRadius * atmosphere.outerRadius },
        fKrESun: { value: atmosphere.Kr * atmosphere.ESun },
        fKmESun: { value: atmosphere.Km * atmosphere.ESun },
        fKr4PI: { value: atmosphere.Kr * 4.0 * Math.PI },
        fKm4PI: { value: atmosphere.Km * 4.0 * Math.PI },
        fScale: { value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius) },
        fScaleDepth: { value: atmosphere.scaleDepth },
        fScaleOverScaleDepth: { value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius) / atmosphere.scaleDepth },
        g: { value: atmosphere.g },
        g2: { value: atmosphere.g * atmosphere.g },
        nSamples: { value: 3 },
        fSamples: { value: 3.0 },
        tDisplacement: { value: new THREE.Texture() },
        tSkyboxDiffuse: { value: new THREE.Texture() },
        fNightScale: { value: 1.0 },
    };

    this.ground = {
        geometry: new THREE.SphereGeometry(atmosphere.innerRadius, 50, 50),
        material: new THREE.ShaderMaterial({
            uniforms: uniformsSky,
            vertexShader: groundVS,
            fragmentShader: groundFS,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        }),
    };

    this.ground.mesh = new THREE.Mesh(this.ground.geometry, this.ground.material);

    this.sky = {
        geometry: new THREE.SphereGeometry(atmosphere.outerRadius, 196, 196),
        material: new THREE.ShaderMaterial({
            uniforms: uniformsSky,
            vertexShader: skyVS,
            fragmentShader: skyFS,
        }),
    };

    this.sky.mesh = new THREE.Mesh(this.sky.geometry, this.sky.material);
    this.sky.material.side = THREE.BackSide;
    this.sky.material.transparent = true;

    this.ground.mesh.visible = false;
    this.sky.mesh.visible = false;
    this.add(this.ground.mesh);
    this.add(this.sky.mesh);

    this.skyDome = new Sky();
    this.skyDome.mesh.frustumCulled = false;
    this.skyDome.mesh.material.transparent = true;
    this.skyDome.mesh.visible = false;
    this.skyDome.mesh.material.depthWrite = false;
    this.add(this.skyDome.mesh);


    var effectController = {
        turbidity: 10,
        reileigh: 2,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.8,
        luminance: 1,
        inclination: 0.49, // elevation / inclination
        azimuth: 0.25, // Facing front,
        sun: !true,
    };

    var uniforms = this.skyDome.uniforms;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.reileigh.value = effectController.reileigh;
    uniforms.luminance.value = effectController.luminance;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;
    uniforms.up.value = new THREE.Vector3(); // no more necessary, estimate normal from cam..
}

Atmosphere.prototype = Object.create(THREE.Mesh.prototype);
Atmosphere.prototype.constructor = Atmosphere;

Atmosphere.prototype.setRealisticOn = function setRealisticOn(bool) {
    this.realistic = bool;
    this.material.visible = !this.realistic;
    this.atmosphereIN.visible = !this.realistic;
    this.ground.mesh.visible = this.realistic;
    this.sky.mesh.visible = this.realistic;
    this.skyDome.mesh.visible = this.realistic;
    // this.lensFlare.visible = this.realistic;

    // this.sphereSun.visible     = this.realistic;
};

Atmosphere.prototype.updateLightingPos = function updateLightingPos(pos) {
    this.ground.material.uniforms.v3LightPosition.value = pos.clone().normalize();
    this.sky.material.uniforms.v3LightPosition.value = pos.clone().normalize();
    //  this.sphereSun.position.copy(pos);
    this.skyDome.uniforms.sunPosition.value.copy(pos);
    // this.lensFlare.position.copy(pos);
};

export default Atmosphere;
