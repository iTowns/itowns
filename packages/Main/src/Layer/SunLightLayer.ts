import * as THREE from 'three';
import GeometryLayer from './GeometryLayer';
import { getRig } from '../Utils/CameraUtils';

interface UpdateContext {
    camera: {
        camera3D: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    };
    view: {
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        sunDirection?: THREE.Vector3;
    };
}

/**
 * Manages directional lighting and shadows as a layer.
 * Updates the sun light position and shadow camera parameters
 * based on the current camera view and sun direction.
 */
class SunLightLayer extends GeometryLayer {
    sunLight: THREE.DirectionalLight;
    isSunLightLayer: boolean;

    constructor(view: UpdateContext['view']) {
        const object3d = new THREE.Group();
        const id = 'sunlight';
        object3d.name = id;

        super(id, object3d, { source: null });

        this.isSunLightLayer = true;

        this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
        this.sunLight.shadow.mapSize.set(4096, 4096);

        this.sunLight.castShadow = this.castShadow;
        this.defineLayerProperty('castShadow', this.castShadow, () => {
            this.sunLight.castShadow = this.castShadow;
        });

        this.object3d.add(
            this.sunLight,
            this.sunLight.target); // to update matrixWorld at each frame

        view.renderer.shadowMap.enabled = true;
        view.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    preUpdate() {
        return [this];
    }

    /**
     * Updates the sun light position and its target to shine on what the
     * camera sees. Dynamically adjusts the shadow box size to minimize
     * flickering while covering the visible area.
     */
    update(context: UpdateContext) {
        if (!context.view.sunDirection) { return; }

        const camera = context.camera.camera3D;
        const sunDirection = context.view.sunDirection;

        // Center the shadow around the camera's target position
        const sunTargetPos = getRig(camera).targetWorldPosition || camera.position;

        // Only update if the position has changed enough,
        // to avoid flickering effect
        const prevSunTargetPos = this.sunLight.target.position;
        if (sunTargetPos.distanceTo(prevSunTargetPos) > 100) {
            this.sunLight.target.position.copy(sunTargetPos);
            this.sunLight.target.updateMatrixWorld();
        }

        const shadowCam = this.sunLight.shadow.camera;
        const prevShadowHalfSide = shadowCam.top;
        this.sunLight.position.copy(sunDirection).multiplyScalar(prevShadowHalfSide)
            .add(prevSunTargetPos);
        this.sunLight.updateMatrixWorld();

        // Calculate shadow box half-side to render shadows on all screen
        // in most cases. These values were determined empirically.
        // Only update if the value has changed enough,
        // to avoid flickering effect
        const shadowHalfSide = 0.017 * camera.far + 200;
        if (Math.abs(shadowHalfSide - prevShadowHalfSide) > prevShadowHalfSide * 0.1) {
            shadowCam.far = 2 * shadowHalfSide;
            shadowCam.left = -shadowHalfSide;
            shadowCam.right = shadowHalfSide;
            shadowCam.top = shadowHalfSide;
            shadowCam.bottom = -shadowHalfSide;
            shadowCam.updateProjectionMatrix();
        }
    }
}

export default SunLightLayer;
