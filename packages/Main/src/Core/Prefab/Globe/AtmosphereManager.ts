import * as THREE from 'three';

import {
    AerialPerspectiveEffect,
    PrecomputedTextures,
} from '@takram/three-atmosphere';


import {
    EffectPass,
    ToneMappingEffect,
    ToneMappingMode,
    EffectMaterial,
    EffectComposer,
} from 'postprocessing';

export default class AtmosphereManager {
    private readonly aerialPerspective: AerialPerspectiveEffect;
    public readonly effectPass: EffectPass;

    constructor(
        camera: THREE.Camera,
        composer: EffectComposer,
        textures: PrecomputedTextures,
    ) {
        this.aerialPerspective = new AerialPerspectiveEffect(camera, {
            transmittance: false,
            inscatter: false,
        });
        this.aerialPerspective.setSize(window.innerWidth, window.innerHeight);

        Object.assign(this.aerialPerspective, textures);

        composer.addPass(new EffectPass(camera, this.aerialPerspective));
        this.effectPass = new EffectPass(
            camera,
            this.aerialPerspective,
            new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
        );
        composer.addPass(this.effectPass);
    }

    update(
        camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
        sunDirection: THREE.Vector3,
    ) {
        this.aerialPerspective.sunDirection.copy(sunDirection);
        // attenuate aerial perspective when far away.
        // value determined experimentally
        this.aerialPerspective.blendMode.opacity.value = Math.max(1 - 2e-7 * camera.near, 0);

        // The changes to the camera's near/far must be manually updated
        // to the uniforms used in post-processing effects
        (this.effectPass.fullscreenMaterial as EffectMaterial).adoptCameraSettings(camera);
    }
}
