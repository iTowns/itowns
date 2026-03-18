import * as THREE from 'three';
import {
    AerialPerspectiveEffect,
    SkyLightProbe,
    SkyMaterial,
    getMoonDirectionECEF,
    getSunDirectionECEF,
    PrecomputedTexturesGenerator,
    SunDirectionalLight,
} from '@takram/three-atmosphere';
import {
    EffectPass,
    ToneMappingEffect,
    ToneMappingMode,
    EffectMaterial,
    FXAAEffect,
} from 'postprocessing';
import View from 'Core/View';
import PostProcessManager from 'Renderer/PostProcessManager';

class SkyManager {
    sky: THREE.Mesh;
    skyLight: SkyLightProbe;
    sunLight: SunDirectionalLight;
    aerialPerspective: AerialPerspectiveEffect;
    effectPass: EffectPass;
    scene: THREE.Scene;
    composer: PostProcessManager;
    fog: THREE.Fog;
    view: View;

    public date: Date;

    constructor(view: View) {
        this.view = view;
        const scene = view.scene;
        this.scene = scene;
        const camera = view.camera3D;
        const composer = view.mainLoop.gfxEngine.postProcessManager;
        this.composer = composer;

        // SkyMaterial disables projection.
        // Provide a plane that covers clip space.
        const skyMaterial = new SkyMaterial();
        this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial);
        this.sky.frustumCulled = false;

        // SkyLightProbe computes sky irradiance of its position.
        this.skyLight = new SkyLightProbe();
        this.skyLight.intensity = 1;
        this.skyLight.position.copy(camera.position);

        this.date = new Date(); // now

        // SunDirectionalLight computes sunlight transmittance
        // to its target position.
        // Only creating a sky light probe *and* a sunlight
        // (without adding them to the scene) is enough to render a sky.
        this.sunLight = new SunDirectionalLight({ distance: 300 });
        this.sunLight.intensity = 0.2;
        this.sunLight.target.position.copy(camera.position);

        this.aerialPerspective = new AerialPerspectiveEffect(camera);
        this.aerialPerspective.setSize(window.innerWidth, window.innerHeight);

        const renderer = view.renderer;
        renderer.toneMappingExposure = 10;

        this.effectPass = new EffectPass(
            camera,
            this.aerialPerspective,
            new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
        );
        composer.addPass(new EffectPass(camera, new FXAAEffect())); // anti-aliasing

        // Generate precomputed textures.
        const generator = new PrecomputedTexturesGenerator(renderer);
        generator.update().catch((error) => { console.error(error); });

        const textures = generator.textures;
        Object.assign(skyMaterial, textures);
        this.sunLight.transmittanceTexture = textures.transmittanceTexture;
        this.skyLight.irradianceTexture = textures.irradianceTexture;
        Object.assign(this.aerialPerspective, textures);

        this.fog = scene.fog;

        this.enable();

        // actually only useful if Sun or Moon direction has changed
        // which is currently always the case because based on current time,
        // or if camera has moved.
        scene.onBeforeRender = () => {
            // disable fog only during render
            // to let its parameters be modified elsewhere
            if (this.enabled) { this.scene.fog = null; }
            this.update(camera);
        };
        scene.onAfterRender = () => {
            if (this.enabled) { this.scene.fog = this.fog; }
        };

        this.composer.render(this.view.scene, this.view.camera3D, this.view);
    }

    update(camera: THREE.Camera) {
        if (!this.enabled) { return; }

        const sunDirection = new THREE.Vector3();
        const moonDirection = new THREE.Vector3();

        getSunDirectionECEF(this.date, sunDirection);
        getMoonDirectionECEF(this.date, moonDirection);
        // This creates a white disk at the Sun's position
        sunDirection.multiplyScalar(1.00002);

        this.sky.updateMatrixWorld();

        const skyMaterial = <SkyMaterial> this.sky.material;
        skyMaterial.sunDirection.copy(sunDirection);
        skyMaterial.moonDirection.copy(moonDirection);

        this.aerialPerspective.sunDirection.copy(sunDirection);

        // attenuate aerial perspective when far away.
        // value determined experimentally
        const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
        this.aerialPerspective.blendMode.opacity.value = Math.max(1 - 2e-7 * cam.near, 0);

        // The changes to the camera's near/far must be manually updated
        // to the uniforms used in post-processing effects
        (this.effectPass.fullscreenMaterial as EffectMaterial).adoptCameraSettings(camera);

        this.sunLight.sunDirection.copy(sunDirection);
        this.sunLight.update();

        this.skyLight.sunDirection.copy(sunDirection);
        this.skyLight.position.copy(camera.position); // position must not be the origin
        this.skyLight.update();

        // necessary for Three to compute the light direction
        this.sunLight.updateMatrixWorld();
        this.sunLight.target.updateMatrixWorld();
        this.skyLight.updateMatrixWorld();
    }

    get enabled() {
        return !!this.sky.parent; // sky has a parent (the scene)
    }

    set enabled(on: boolean) {
        if (this.enabled == on) { return; }
        if (on) { this.enable(); } else { this.disable(); }

        // force internally calling state.buffers.color.setClear
        // to get a correct background color
        // this.view.renderer.setClearAlpha(this.view.renderer.getClearAlpha());

        this.composer.render(this.view.scene, this.view.camera3D, this.view);
    }

    enable() {
        this.scene.add(
            this.sky,
            this.sunLight,
            this.sunLight.target, // to update matrixWorld at each frame
            this.skyLight);

        // if (this.composer.hasPass(this.effectPass)) {
        //     this.composer.enablePass(this.effectPass);
        //     return;
        // }
        // this.composer.addPass(this.effectPass);
    }

    disable() {
        this.scene.remove(this.sky, this.sunLight, this.sunLight.target, this.skyLight);

        if (this.composer.hasPass(this.effectPass)) {
            this.composer.disablePass(this.effectPass);
        }
    }
}

export default SkyManager;
