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
    RenderPass,
    ToneMappingEffect,
    FXAAEffect,
    ToneMappingMode,
} from 'postprocessing';
import View from 'Core/View';

class SkyManager {
    sky: THREE.Mesh;
    skyLight: SkyLightProbe;
    sunLight: SunDirectionalLight;
    aerialPerspective: AerialPerspectiveEffect;

    public date: Date;

    constructor(view: View) {
        const scene = view.scene;
        const camera = view.camera3D;
        const composer = view.mainLoop.gfxEngine.composer;

        // SkyMaterial disables projection.
        // Provide a plane that covers clip space.
        const skyMaterial = new SkyMaterial();
        this.sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial);
        this.sky.frustumCulled = false;
        scene.add(this.sky);

        // SkyLightProbe computes sky irradiance of its position.
        this.skyLight = new SkyLightProbe();
        this.skyLight.intensity = 1;
        this.skyLight.position.copy(camera.position);
        scene.add(this.skyLight);

        this.date = new Date(); // now

        // SunDirectionalLight computes sunlight transmittance
        // to its target position.
        // Only creating a sky light probe *and* a sunlight
        // (without adding them to the scene) is enough to render a sky.
        this.sunLight = new SunDirectionalLight({ distance: 300 });
        this.sunLight.intensity = 0.1;
        this.sunLight.target.position.copy(camera.position);

        scene.add(this.sunLight);
        scene.add(this.sunLight.target); // to update matrixWorld at each frame

        this.aerialPerspective = new AerialPerspectiveEffect(camera, {
            transmittance: false,
            inscatter: false,
        });
        this.aerialPerspective.setSize(window.innerWidth, window.innerHeight);

        const renderer = view.renderer;
        renderer.toneMappingExposure = 10;

        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new EffectPass(camera, this.aerialPerspective));
        composer.addPass(
            new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.AGX })),
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

        scene.fog = null;

        scene.onBeforeRender = () => { this.update(camera); };
    }

    update(camera: THREE.Camera) {
        const sunDirection = new THREE.Vector3();
        const moonDirection = new THREE.Vector3();

        getSunDirectionECEF(this.date, sunDirection);
        getMoonDirectionECEF(this.date, moonDirection);
        // This creates a white disk at the Sun's position
        sunDirection.multiplyScalar(1.00002);

        this.sky.position.copy(camera.position); // what does it change?
        this.sky.updateMatrixWorld();

        const skyMaterial = <SkyMaterial> this.sky.material;
        skyMaterial.sunDirection.copy(sunDirection);
        skyMaterial.moonDirection.copy(moonDirection);
        skyMaterial.needsUpdate = true; // useless?

        this.aerialPerspective.sunDirection.copy(sunDirection);

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
}

export default SkyManager;
