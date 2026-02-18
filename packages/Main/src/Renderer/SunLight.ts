import * as THREE from 'three';
import { getRig }  from '../Utils/CameraUtils';

/**
 * Manages directional lighting and shadows for the 3D scene.
 * Extends THREE.DirectionalLight to provide automatic shadow camera alignment
 * and dynamic sizing based on camera parameters.
 */
class SunLight extends THREE.DirectionalLight {
    /**
     * Creates a new SunLight instance.
     *
     * @param intensity - The light intensity. Defaults to 1.
     */
    constructor(intensity?: number) {
        super(0xffffff, intensity);
        this.castShadow = true;
        this.shadow.mapSize.set(4096, 4096);
    }
    /**
     * Updates the sun light position and its target to shine on
     * what the camera sees.
     *
     * Dynamically adjusts the shadow box size to minimize flickering while
     * covering the visible area.
     *
     * @param sunDirection - Direction of the sun light.
     * @param camera - The camera to align shadows with.
     */
    update(
        sunDirection: THREE.Vector3,
        camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    ) {
        // Center the shadow around the camera's target position
        const sunTargetPos = getRig(camera).targetWorldPosition || camera.position;

        // Only update if the position has changed enough,
        // to avoid flickering effect
        const prevSunTargetPos = this.target.position;
        if (sunTargetPos.distanceTo(prevSunTargetPos) > 100) {
            this.target.position.copy(sunTargetPos);
            this.target.updateMatrixWorld();
        }
        const shadowCam = this.shadow.camera;
        const prevShadowHalfSide = shadowCam.top;
        this.position.copy(sunDirection).multiplyScalar(prevShadowHalfSide)
            .add(prevSunTargetPos);
        this.updateMatrixWorld();

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

export default SunLight;
