import * as THREE from 'three';
import {
    getSunDirectionECEF,
} from '@takram/three-atmosphere';
import SkyManager from 'Core/Prefab/Globe/SkyManager';
import GeometryLayer from './GeometryLayer';
import { getRig } from '../Utils/CameraUtils';

interface UpdateContext {
    camera: {
        camera3D: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    };
    view: {
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        date: Date;
        skyManager: SkyManager;
    };
}

/**
 * Manages directional lighting and shadows as a layer.
 * Updates the sun light position and shadow camera parameters
 * based on the current camera view and sun direction.
 */
class SunLightLayer extends GeometryLayer {
    sunLight: THREE.DirectionalLight;
    sunDirection: THREE.Vector3;
    isSunLightLayer: boolean;

    private _prevSunIntensity = 0;

    constructor() {
        const object3d = new THREE.Group();
        const id = 'sunlight';
        object3d.name = id;

        super(id, object3d, { source: null });

        this.isSunLightLayer = true;
        this.sunDirection = new THREE.Vector3();

        this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
        this.sunLight.shadow.mapSize.set(4096, 4096);

        this.sunLight.castShadow = this.castShadow;
        this.defineLayerProperty('castShadow', this.castShadow, () => {
            this.sunLight.castShadow = this.castShadow;
        });

        this.object3d.add(
            this.sunLight,
            this.sunLight.target); // to update matrixWorld at each frame
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
        const camera = context.camera.camera3D;

        const { view } = context;

        getSunDirectionECEF(view.date, this.sunDirection);
        // This creates a white disk at the Sun's position
        this.sunDirection.multiplyScalar(1.00002);

        // actually only useful if Sun or Moon direction has changed
        if (view.skyManager) { view.skyManager.update(); }

        // Center the shadow around the camera's target position
        const sunTargetPos = getRig(camera).targetWorldPosition || camera.position;

        // Turn sunlight on/off based on sun elevation above/below local horizon
        const sunElevation = this.sunDirection.dot(sunTargetPos);
        if (sunElevation < 0 && this.sunLight.intensity) {
            this._prevSunIntensity = this.sunLight.intensity;
            this.sunLight.intensity = 0;
        } else if (sunElevation >= 0 && !this.sunLight.intensity) {
            this.sunLight.intensity = this._prevSunIntensity;
        }

        // Only update if the position has changed enough,
        // to avoid flickering effect
        const prevSunTargetPos = this.sunLight.target.position;
        if (sunTargetPos.distanceTo(prevSunTargetPos) > 100) {
            this.sunLight.target.position.copy(sunTargetPos);
            this.sunLight.target.updateMatrixWorld();
        }

        const shadowCam = this.sunLight.shadow.camera;
        const prevShadowHalfSide = shadowCam.top;
        this.sunLight.position.copy(this.sunDirection).multiplyScalar(prevShadowHalfSide)
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
