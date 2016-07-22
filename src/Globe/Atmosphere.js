/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import NodeMesh from 'Renderer/NodeMesh';
import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';
import Sky from 'Globe/SkyShader';
import skyFS from 'Renderer/Shader/skyFS.glsl';
import skyVS from 'Renderer/Shader/skyVS.glsl';
import groundFS from 'Renderer/Shader/groundFS.glsl';
import groundVS from 'Renderer/Shader/groundVS.glsl';
import GlowFS from 'Renderer/Shader/GlowFS.glsl';
import GlowVS from 'Renderer/Shader/GlowVS.glsl';

function Atmosphere(ellipsoid) {

    NodeMesh.call(this);

    var size = ellipsoid.size;

    this.realistic = false;
    this.sphereSun = null;

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

    var material = new THREE.ShaderMaterial({

        uniforms: this.uniformsOut,
        vertexShader: GlowVS,
        fragmentShader: GlowFS,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        wireframe: false

    });

    var geometry = (new THREE.SphereGeometry(1.14, 128, 128)).scale(size.x, size.y, size.z);


    this.geometry = geometry;
    this.material = material;

    //this.atmosphereOUT    = new THREE.Mesh(geometry,material);
    //this.add(this.atmosphereOUT);

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
        mieScaleDepth: 0.1
    };


    var uniformsSky = {
        v3LightPosition: {
            type: "v3",
            value: defaultValue.lightingPos.clone().normalize()
        },
        v3InvWavelength: {
            type: "v3",
            value: new THREE.Vector3(1 / Math.pow(atmosphere.wavelength[0], 4), 1 / Math.pow(atmosphere.wavelength[1], 4), 1 / Math.pow(atmosphere.wavelength[2], 4))
        },
        fCameraHeight: {
            type: "f",
            value: 0.0
        },
        fCameraHeight2: {
            type: "f",
            value: 0.0
        },
        fInnerRadius: {
            type: "f",
            value: atmosphere.innerRadius
        },
        fInnerRadius2: {
            type: "f",
            value: atmosphere.innerRadius * atmosphere.innerRadius
        },
        fOuterRadius: {
            type: "f",
            value: atmosphere.outerRadius
        },
        fOuterRadius2: {
            type: "f",
            value: atmosphere.outerRadius * atmosphere.outerRadius
        },
        fKrESun: {
            type: "f",
            value: atmosphere.Kr * atmosphere.ESun
        },
        fKmESun: {
            type: "f",
            value: atmosphere.Km * atmosphere.ESun
        },
        fKr4PI: {
            type: "f",
            value: atmosphere.Kr * 4.0 * Math.PI
        },
        fKm4PI: {
            type: "f",
            value: atmosphere.Km * 4.0 * Math.PI
        },
        fScale: {
            type: "f",
            value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius)
        },
        fScaleDepth: {
            type: "f",
            value: atmosphere.scaleDepth
        },
        fScaleOverScaleDepth: {
            type: "f",
            value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius) / atmosphere.scaleDepth
        },
        g: {
            type: "f",
            value: atmosphere.g
        },
        g2: {
            type: "f",
            value: atmosphere.g * atmosphere.g
        },
        nSamples: {
            type: "i",
            value: 3
        },
        fSamples: {
            type: "f",
            value: 3.0
        },

        tDisplacement: {
            type: "t",
            value: new THREE.Texture()
        },
        tSkyboxDiffuse: {
            type: "t",
            value: new THREE.Texture()
        },
        fNightScale: {
            type: "f",
            value: 1.0
        }
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
            depthWrite: false
        })
    };

    this.ground.mesh = new THREE.Mesh(this.ground.geometry, this.ground.material);

    this.sky = {
        geometry: new THREE.SphereGeometry(atmosphere.outerRadius, 196, 196),
        material: new THREE.ShaderMaterial({
            uniforms: uniformsSky,
            vertexShader: skyVS,
            fragmentShader: skyFS
        })
    };

    this.sky.mesh = new THREE.Mesh(this.sky.geometry, this.sky.material);
    this.sky.material.side = THREE.BackSide;
    this.sky.material.transparent = true;

    this.ground.mesh.visible = false;
    this.sky.mesh.visible = false;
    this.add(this.ground.mesh);
    this.add(this.sky.mesh);
    /*
        this.sphereSun = new THREE.Mesh((new THREE.SphereGeometry( 1000000,32,32 )), new THREE.MeshBasicMaterial());
        this.sphereSun.position.copy(defaultValue.lightingPos);
        this.add(this.sphereSun);

    */

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
        sun: !true
    };

    var uniforms = this.skyDome.uniforms;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.reileigh.value = effectController.reileigh;
    uniforms.luminance.value = effectController.luminance;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;
    uniforms.up.value = new THREE.Vector3(); // no more necessary, estimate normal from cam..


    // LensFlare

    var textureLoader = new THREE.TextureLoader();
    var textureFlare0 = textureLoader.load("data/textures/lensflare/lensflare0.png");
    var textureFlare2 = textureLoader.load("data/textures/lensflare/lensflare2.png");
    var textureFlare3 = textureLoader.load("data/textures/lensflare/lensflare3.png");
    var h = 0.55,
        s = 0.9,
        l = 0.5;
    //    var x=10000000, y=10000000, z=0;
    var flareColor = new THREE.Color(0xffffff);
    flareColor.setHSL(h, s, l + 0.5);

    this.lensFlare = new THREE.LensFlare(textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor);
    this.lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare3, 60, 0.6, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare3, 70, 0.7, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare3, 120, 0.9, THREE.AdditiveBlending);
    this.lensFlare.add(textureFlare3, 70, 1.0, THREE.AdditiveBlending);
    this.add(this.lensFlare);

}

Atmosphere.prototype = Object.create(NodeMesh.prototype);
Atmosphere.prototype.constructor = Atmosphere;

Atmosphere.prototype.setRealisticOn = function(bool) {

    this.realistic = bool;
    this.material.visible = !this.realistic;
    this.atmosphereIN.visible = !this.realistic;
    this.ground.mesh.visible = this.realistic;
    this.sky.mesh.visible = this.realistic;
    this.skyDome.mesh.visible = this.realistic;
    this.lensFlare.visible = this.realistic;

    // this.sphereSun.visible     = this.realistic;
};

Atmosphere.prototype.updateLightingPos = function(pos) {

    this.ground.material.uniforms.v3LightPosition.value = pos.clone().normalize();
    this.sky.material.uniforms.v3LightPosition.value = pos.clone().normalize();
    //  this.sphereSun.position.copy(pos);
    this.skyDome.uniforms.sunPosition.value.copy(pos);
    this.lensFlare.position.copy(pos);
};


export default Atmosphere;
