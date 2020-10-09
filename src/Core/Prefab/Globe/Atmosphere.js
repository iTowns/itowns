/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import Coordinates from 'Core/Geographic/Coordinates';
import { ellipsoidSizes } from 'Core/Math/Ellipsoid';
import CoordStars from 'Core/Geographic/CoordStars';
import Sky from './SkyShader';
import skyFS from './Shaders/skyFS.glsl';
import skyVS from './Shaders/skyVS.glsl';
import groundFS from './Shaders/groundFS.glsl';
import groundVS from './Shaders/groundVS.glsl';
import GlowFS from './Shaders/GlowFS.glsl';
import GlowVS from './Shaders/GlowVS.glsl';

const LIGHTING_POSITION = new THREE.Vector3(1, 0, 0);
const v = new THREE.Vector3();

const coordCam = new Coordinates('EPSG:4326');
const coordGeoCam = new Coordinates('EPSG:4326');
const skyBaseColor = new THREE.Color(0x93d5f8);
const colorSky = new THREE.Color();
const spaceColor = new THREE.Color(0x030508);
const limitAlti = 600000;
const mfogDistance = ellipsoidSizes.x * 160.0;

class Atmosphere extends GeometryLayer {
    constructor(id = 'atmosphere', options = {}) {
        super(id, new THREE.Object3D(), options);
        this.isAtmosphere = true;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                atmoIN: {
                    type: 'i',
                    value: 0,
                },
                screenSize: {
                    type: 'v2',
                    value: new THREE.Vector2(window.innerWidth, window.innerHeight),
                }, // Should be updated on screen resize...
            },
            vertexShader: GlowVS,
            fragmentShader: GlowFS,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            wireframe: false,
        });

        const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
        const basicAtmosphereOut = new THREE.Mesh(sphereGeometry, material);
        basicAtmosphereOut.scale.copy(ellipsoidSizes).multiplyScalar(1.14);

        this.basicAtmosphere = new THREE.Object3D();
        this.realisticAtmosphere = new THREE.Object3D();
        this.realisticAtmosphere.visible = false;
        this.object3d.add(this.basicAtmosphere);
        this.object3d.add(this.realisticAtmosphere);

        this.basicAtmosphere.add(basicAtmosphereOut);

        var materialAtmoIn = new THREE.ShaderMaterial({
            uniforms: {
                atmoIN: {
                    type: 'i',
                    value: 1,
                },
                screenSize: {
                    type: 'v2',
                    value: new THREE.Vector2(window.innerWidth, window.innerHeight),
                }, // Should be updated on screen resize...
            },
            vertexShader: GlowVS,
            fragmentShader: GlowFS,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
        });

        const basicAtmosphereIn = new THREE.Mesh(sphereGeometry, materialAtmoIn);
        basicAtmosphereIn.scale.copy(ellipsoidSizes).multiplyScalar(1.002);

        this.basicAtmosphere.add(basicAtmosphereIn);
        this.realisticLightingPosition = { x: -0.5, y: 0.0, z: 1.0 };

        this.fog = {
            enable: true,
            distance: mfogDistance,
        };

        this.object3d.updateMatrixWorld();
    }

    update(context, layer, node) {
        // update uniforms
        node.material.fogDistance = this.fog.distance;
        node.material.lightingEnabled = this.realisticAtmosphere.visible;
        node.material.lightPosition = this.realisticLightingPosition;
    }

    // eslint-disable-next-line no-unused-vars
    preUpdate(context, srcs) {
        const cameraPosition = context.view.camera.camera3D.position;
        if (this.fog.enable) {
            v.setFromMatrixPosition(context.view.tileLayer.object3d.matrixWorld);
            const len = v.distanceTo(cameraPosition);
            // Compute fog distance, this function makes it possible to have a shorter distance
            // when the camera approaches the ground
            this.fog.distance = mfogDistance * ((len - ellipsoidSizes.x * 0.99) * 0.25 / ellipsoidSizes.x) ** 1.5;
        } else {
            this.fog.distance = 10e10;
        }

        const renderer = context.view.mainLoop.gfxEngine.renderer;
        // get altitude camera
        coordCam.crs = context.view.referenceCrs;
        coordCam.setFromVector3(cameraPosition).as('EPSG:4326', coordGeoCam);
        const altitude = coordGeoCam.altitude;

        // If the camera altitude is below limitAlti,
        // we interpolate between the sky color and the space color
        if (altitude < limitAlti) {
            const t = (limitAlti - altitude) / limitAlti;
            colorSky.copy(spaceColor).lerp(skyBaseColor, t);
            renderer.setClearColor(colorSky, renderer.getClearAlpha());
        } else {
            renderer.setClearColor(spaceColor, renderer.getClearAlpha());
        }
    }

    // default to non-realistic lightning
    _initRealisticLighning() {
        // Atmosphere Shader From Space (Atmospheric scattering)
        // http://stainlessbeer.weebly.com/planets-9-atmospheric-scattering.html
        const atmosphere = {
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
        const uniformsAtmosphere = {
            v3LightPosition: { value: LIGHTING_POSITION.clone().normalize() },
            v3InvWavelength: { value: new THREE.Vector3(1 / atmosphere.wavelength[0] ** 4, 1 / atmosphere.wavelength[1] ** 4, 1 / atmosphere.wavelength[2] ** 4) },
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

        const geometryAtmosphereIn = new THREE.SphereGeometry(atmosphere.innerRadius, 50, 50);
        const materialAtmosphereIn = new THREE.ShaderMaterial({
            uniforms: uniformsAtmosphere,
            vertexShader: groundVS,
            fragmentShader: groundFS,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const ground = new THREE.Mesh(geometryAtmosphereIn, materialAtmosphereIn);

        const geometryAtmosphereOut = new THREE.SphereGeometry(atmosphere.outerRadius, 196, 196);
        const materialAtmosphereOut = new THREE.ShaderMaterial({
            uniforms: uniformsAtmosphere,
            vertexShader: skyVS,
            fragmentShader: skyFS,
            transparent: true,
            side: THREE.BackSide,
        });
        const sky = new THREE.Mesh(geometryAtmosphereOut, materialAtmosphereOut);

        const skyDome = new Sky();
        skyDome.frustumCulled = false;

        ground.layers.mask = this.object3d.layers.mask;
        sky.layers.mask = this.object3d.layers.mask;
        skyDome.layers.mask = this.object3d.layers.mask;
        this.realisticAtmosphere.add(ground);
        this.realisticAtmosphere.add(sky);
        this.realisticAtmosphere.add(skyDome);
        const effectController = {
            turbidity: 10,
            reileigh: 2,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            luminance: 1,
            inclination: 0.49, // elevation / inclination
            azimuth: 0.25, // Facing front,
            sun: !true,
        };
        skyDome.material.uniforms.turbidity.value = effectController.turbidity;
        skyDome.material.uniforms.reileigh.value = effectController.reileigh;
        skyDome.material.uniforms.luminance.value = effectController.luminance;
        skyDome.material.uniforms.mieCoefficient.value = effectController.mieCoefficient;
        skyDome.material.uniforms.mieDirectionalG.value = effectController.mieDirectionalG;
        skyDome.material.uniforms.up.value = new THREE.Vector3(); // no more necessary, estimate normal from cam..
    }

    setRealisticOn(bool) {
        if (bool && !this.sky) {
            this._initRealisticLighning();
        }

        this.basicAtmosphere.visible = !bool;
        this.realisticAtmosphere.visible = bool;

        if (bool) {
            this.realisticLightingPosition = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();
            this.realisticAtmosphere.children.forEach((obj => obj.material.uniforms.v3LightPosition.value.copy(this.realisticLightingPosition)));
        }
    }
}

export default Atmosphere;
