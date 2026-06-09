import * as THREE from 'three';
import {
    AerialPerspectiveEffect,
    SkyLightProbe,
    SkyMaterial,
    getMoonDirectionECEF,
    PrecomputedTexturesGenerator,
    AtmosphereParameters,
} from '@takram/three-atmosphere';

import {
    EffectPass,
    RenderPass,
    ToneMappingEffect,
    FXAAEffect,
    ToneMappingMode,
    EffectMaterial,
    EffectComposer,
} from 'postprocessing';
import GlobeView from 'Core/Prefab/GlobeView';
import SunLightLayer from 'Layer/SunLightLayer';
import ISkyStrategy from './ISkyStrategy';

export interface RealisticSkyParameters {
    rayleighScattering: THREE.Vector3;
    mieScattering: THREE.Vector3;
    mieExtinction: THREE.Vector3;
    miePhaseFunctionG: number;
}

class RealisticSky implements ISkyStrategy {
    sky: THREE.Mesh;
    skyLight: SkyLightProbe;
    aerialPerspective: AerialPerspectiveEffect;
    renderPass: RenderPass;
    effectPass: EffectPass;
    FXAAPass: EffectPass;
    scene: THREE.Scene;
    composer: EffectComposer;
    view: GlobeView;
    sunLightLayer: SunLightLayer;
    ready: boolean;
    private _originalIntensity: number;

    constructor(view: GlobeView, sunLightLayer: SunLightLayer, params?: RealisticSkyParameters) {
        this.view = view;
        const scene = view.scene;
        this.scene = scene;
        const camera = view.camera3D;
        const composer = view.mainLoop.gfxEngine.composer;
        this.composer = composer;
        this.sunLightLayer = sunLightLayer;
        this.ready = false;
        this._originalIntensity = sunLightLayer.sunLight.intensity;

        // SkyMaterial disables projection.
        // Provide a plane that covers clip space.
        const skyMaterial = new SkyMaterial();
        this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial);
        this.sky.frustumCulled = false;
        this.sky.visible = false;
        scene.add(this.sky);

        // SkyLightProbe computes sky irradiance of its position.
        this.skyLight = new SkyLightProbe();
        this.skyLight.intensity = 0.5;
        this.skyLight.position.copy(camera.position);
        this.skyLight.visible = false;
        scene.add(this.skyLight);

        this.aerialPerspective = new AerialPerspectiveEffect(camera);

        const rendererSize = new THREE.Vector2();
        view.mainLoop.gfxEngine.renderer.getSize(rendererSize);
        this.aerialPerspective.setSize(rendererSize.x, rendererSize.y);

        this.renderPass = new RenderPass(scene, camera);
        this.effectPass = new EffectPass(
            camera,
            this.aerialPerspective,
            new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
        );
        this.FXAAPass = new EffectPass(camera, new FXAAEffect());

        // Generate precomputed textures.
        const renderer = view.renderer;
        const generator = new PrecomputedTexturesGenerator(renderer);

        const atmosphereParams = params ? new AtmosphereParameters(params) : AtmosphereParameters.DEFAULT;
        generator.update(atmosphereParams).then(() => {
            const textures = generator.textures;
            Object.assign(skyMaterial, textures);
            this.skyLight.irradianceTexture = textures.irradianceTexture;
            Object.assign(this.aerialPerspective, textures);
            this.ready = true;

            // If already enabled, trigger an update now that textures are ready
            if (this.enabled) {
                this.update();
                this.view.notifyChange(this.view.camera3D);
                this.composer.render();
            }
        }).catch((error) => { console.error(error); });
    }

    update() {
        const camera = this.view.camera3D as THREE.PerspectiveCamera | THREE.OrthographicCamera;
        if (!this.enabled || !this.ready) { return; }

        const sunDirection = this.sunLightLayer.sunDirection;
        const moonDirection = new THREE.Vector3();
        getMoonDirectionECEF(this.view.date, moonDirection);

        this.sky.updateMatrixWorld();

        const skyMaterial = this.sky.material as SkyMaterial;
        skyMaterial.sunDirection.copy(sunDirection);
        skyMaterial.moonDirection.copy(moonDirection);

        this.aerialPerspective.sunDirection.copy(sunDirection);

        // attenuate aerial perspective when far away.
        // value determined experimentally
        this.aerialPerspective.blendMode.opacity.value = Math.max(0.1 - 2e-8 * camera.near, 0.05);

        // The changes to the camera's near/far must be manually updated
        // to the uniforms used in post-processing effects
        (this.effectPass.fullscreenMaterial as EffectMaterial).adoptCameraSettings(camera);

        this.skyLight.sunDirection.copy(sunDirection);
        this.skyLight.position.copy(camera.position); // position must not be the origin
        this.skyLight.update();

        this.skyLight.updateMatrixWorld();
    }

    get enabled() {
        return this.sky.visible;
    }

    set enabled(on: boolean) {
        if (this.enabled === on) { return; }
        this._setState(on);

        // force internally calling state.buffers.color.setClear
        // to get a correct background color
        this.view.renderer.setClearAlpha(this.view.renderer.getClearAlpha());

        if (on) { this.update(); }
    }

    dispose() {
        this._setState(false);

        this.scene.remove(this.sky);
        this.sky.geometry.dispose();
        (this.sky.material as THREE.Material).dispose();

        this.scene.remove(this.skyLight);

        this.aerialPerspective.dispose();
        this.renderPass.dispose();
        this.effectPass.dispose();
        this.FXAAPass.dispose();
    }

    private _setState(on: boolean) {
        // Realistic rendering requires a dimmer sunlight
        this.sunLightLayer.sunLight.intensity = on
            ? this._originalIntensity * 0.1
            : this._originalIntensity;
        this.sky.visible = on;
        this.skyLight.visible = on;

        this.view.renderer.toneMappingExposure = on ? 10 : 1;

        if (on) {
            this.composer.addPass(this.renderPass);
            this.composer.addPass(this.effectPass);
            this.composer.addPass(this.FXAAPass);
        } else {
            this.composer.removePass(this.renderPass);
            this.composer.removePass(this.effectPass);
            this.composer.removePass(this.FXAAPass);
        }
    }
}

export default RealisticSky;
