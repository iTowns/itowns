import * as THREE from 'three';
import {
    SkyLightProbe,
    SkyMaterial,
    getMoonDirectionECEF,
    PrecomputedTexturesGenerator,
} from '@takram/three-atmosphere';
import {
    EffectComposer,
} from 'postprocessing';
import GlobeView from 'Core/Prefab/GlobeView';

class SkyManager {
    sky: THREE.Mesh;
    skyLight: SkyLightProbe;
    generator: PrecomputedTexturesGenerator;
    scene: THREE.Scene;
    composer: EffectComposer;
    view: GlobeView;

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

        const renderer = view.renderer;
        renderer.toneMappingExposure = 10;

        // Generate precomputed textures.
        this.generator = new PrecomputedTexturesGenerator(renderer);
        this.generator.update().catch((error) => { console.error(error); });

        const textures = this.generator.textures;
        Object.assign(skyMaterial, textures);
        this.skyLight.irradianceTexture = textures.irradianceTexture;

        this.composer.render();
    }

    update(date: Date, sunDirection: THREE.Vector3) {
        const camera = this.view.camera3D as THREE.PerspectiveCamera | THREE.OrthographicCamera;

        const moonDirection = new THREE.Vector3();
        getMoonDirectionECEF(date, moonDirection);

        this.sky.updateMatrixWorld();

        const skyMaterial = this.sky.material as SkyMaterial;
        skyMaterial.sunDirection.copy(sunDirection);
        skyMaterial.moonDirection.copy(moonDirection);

        this.skyLight.sunDirection.copy(sunDirection);
        this.skyLight.position.copy(camera.position); // position must not be the origin
        this.skyLight.update();

        this.skyLight.updateMatrixWorld();
    }
}

export default SkyManager;
