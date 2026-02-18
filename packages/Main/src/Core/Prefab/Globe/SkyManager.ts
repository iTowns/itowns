import * as THREE from 'three';
import {
    AerialPerspectiveEffect,
    SkyLightProbe,
    SkyMaterial,
    getMoonDirectionECEF,
    PrecomputedTexturesGenerator,
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

class SkyManager {
    private readonly sky: THREE.Mesh;
    private readonly skyLight: SkyLightProbe;
    private readonly aerialPerspective: AerialPerspectiveEffect;
    private readonly effectPass: EffectPass;
    private readonly scene: THREE.Scene;
    private readonly composer: EffectComposer;
    private readonly fog: THREE.Fog;
    private readonly view: GlobeView;

    constructor(view: GlobeView) {
        this.view = view;
        const scene = view.scene;
        this.scene = scene;
        const camera = view.camera3D;
        const composer = view.mainLoop.gfxEngine.composer;
        this.composer = composer;

        // SkyMaterial disables projection.
        // Provide a plane that covers clip space.
        const skyMaterial = new SkyMaterial();
        this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial);
        this.sky.frustumCulled = false;

        // SkyLightProbe computes sky irradiance of its position.
        this.skyLight = new SkyLightProbe();
        this.skyLight.intensity = 0.5;
        this.skyLight.position.copy(camera.position);

        this.aerialPerspective = new AerialPerspectiveEffect(camera);
        this.aerialPerspective.setSize(window.innerWidth, window.innerHeight);

        const renderer = view.renderer;
        renderer.toneMappingExposure = 10;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        composer.addPass(new RenderPass(scene, camera));
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
        this.skyLight.irradianceTexture = textures.irradianceTexture;
        Object.assign(this.aerialPerspective, textures);

        this.fog = scene.fog;

        this.enable();

        scene.onBeforeRender = () => {
            // disable fog only during render
            // to let its parameters be modified elsewhere
            if (this.enabled) { this.scene.fog = null; }
        };
        scene.onAfterRender = () => {
            if (this.enabled) { this.scene.fog = this.fog; }
        };

        this.composer.render();
    }

    update(date: Date, sunDirection: THREE.Vector3) {
        const camera = this.view.camera3D as THREE.PerspectiveCamera | THREE.OrthographicCamera;
        if (!this.enabled) { return; }

        const moonDirection = new THREE.Vector3();
        getMoonDirectionECEF(date, moonDirection);

        this.sky.updateMatrixWorld();

        const skyMaterial = <SkyMaterial> this.sky.material;
        skyMaterial.sunDirection.copy(sunDirection);
        skyMaterial.moonDirection.copy(moonDirection);

        this.aerialPerspective.sunDirection.copy(sunDirection);

        // attenuate aerial perspective when far away.
        // value determined experimentally
        this.aerialPerspective.blendMode.opacity.value = Math.max(1 - 2e-7 * camera.near, 0);

        // The changes to the camera's near/far must be manually updated
        // to the uniforms used in post-processing effects
        (this.effectPass.fullscreenMaterial as EffectMaterial).adoptCameraSettings(camera);

        this.skyLight.sunDirection.copy(sunDirection);
        this.skyLight.position.copy(camera.position); // position must not be the origin
        this.skyLight.update();

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
        this.view.renderer.setClearAlpha(this.view.renderer.getClearAlpha());

        this.composer.render();
    }

    enable() {
        // Realistic rendering requires a dimmer sunlight
        this.view.sunLight.intensity *= 0.1;
        this.scene.add(this.sky, this.skyLight);
        this.composer.addPass(this.effectPass, 1);
    }

    disable() {
        this.view.sunLight.intensity *= 10;
        this.scene.remove(this.sky, this.skyLight);
        this.composer.removePass(this.effectPass);
    }
}

export default SkyManager;
