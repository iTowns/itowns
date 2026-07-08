import * as THREE from 'three';
import {
    getSunDirectionECEF,
} from '@takram/three-atmosphere';
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
        altitude: number;
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
    forceDaytime: boolean;
    shadowsMaxAltitude: number;
    sunTiltAltitude: number;

    private _prevSunIntensity = 0;
    private readonly _up = new THREE.Vector3();
    private readonly _worldRef = new THREE.Vector3(0, 0, 1);
    private readonly _tangent = new THREE.Vector3();
    private readonly _newSunDirection = new THREE.Vector3();

    /**
     * @param [forceDaytime=false] - Indicates whether to force daytime lighting regardless of the scene's time.
     * @param [shadowsMaxAltitude=30000] - Specifies the maximum altitude at which shadows are cast.
     * @param [sunTiltAltitude=30000] - Specifies the maximum altitude at which the sun tilts when forceDaytime is true
     * @returns
     */
    constructor(forceDaytime = false, shadowsMaxAltitude = 30000, sunTiltAltitude = 30000) {
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

        this.forceDaytime = forceDaytime;
        this.defineLayerProperty('forceDaytime', forceDaytime);

        this.sunTiltAltitude = sunTiltAltitude;
        this.defineLayerProperty('sunTiltAltitude', this.sunTiltAltitude);

        this.shadowsMaxAltitude = shadowsMaxAltitude;

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
     * @param context - The update context.
     */
    update(context: UpdateContext) {
        const camera = context.camera.camera3D;

        const { view } = context;

        if (this.forceDaytime) {
            this._dayTimeSunDirection(
                context.camera.camera3D.position,
                context.view.altitude,
                this.sunDirection,
            );
        } else {
            getSunDirectionECEF(context.view.date, this.sunDirection);
        }

        // Center the shadow around the camera's target position
        const sunTargetPos = getRig(camera).targetWorldPosition || camera.position;

        // Turn sunlight on/off based on sun elevation above/below local horizon when close enough to ground
        const sunElevation = this.sunDirection.dot(sunTargetPos);
        const sunDisabled = sunElevation < 0 && view.altitude < this.shadowsMaxAltitude;

        if (sunDisabled && this.sunLight.intensity) {
            this._prevSunIntensity = this.sunLight.intensity;
            this.sunLight.intensity = 0;
        } else if (!sunDisabled && !this.sunLight.intensity) {
            this.sunLight.intensity = this._prevSunIntensity;
        }

        // Disable shadow casting above an altitude threshold
        const aboveMaxAltitude = view.altitude > this.shadowsMaxAltitude;
        this.sunLight.castShadow = aboveMaxAltitude ? false : this.castShadow;

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

        // Calculate an appropriate shadow box half-side by using camera distance to target
        // Only update if the value has changed enough, to avoid flickering effect
        const shadowHalfSide = camera.position.distanceTo(sunTargetPos);
        if (Math.abs(shadowHalfSide - prevShadowHalfSide) > prevShadowHalfSide * 0.1) {
            shadowCam.far = 2 * shadowHalfSide;
            shadowCam.left = -shadowHalfSide;
            shadowCam.right = shadowHalfSide;
            shadowCam.top = shadowHalfSide;
            shadowCam.bottom = -shadowHalfSide;
            shadowCam.updateProjectionMatrix();
        }
    }

    /*
     * Calculates the direction of the sun to ensure a sunny sky.
     * Updates the provided sunDirection vector with a new calculated direction.
     * The sun is aligned with the camera far away from the globe to show the whole planet.
     * It tilts progressively below this.sunTiltAltitude to cast good-looking shadows.
     */
    _dayTimeSunDirection(cameraPosition: THREE.Vector3, altitude: number, sunDirection: THREE.Vector3) {
        const up = this._up.copy(cameraPosition).normalize();

        // Stable reference axis
        const worldRef = this._worldRef.set(0, 0, 1);
        if (Math.abs(up.dot(worldRef)) > 0.99) {
            worldRef.set(1, 0, 0);
        }

        // tangent = worldRef projected on plane orthogonal to up
        const tangent = this._tangent.copy(worldRef).projectOnPlane(up).normalize();

        const groundTilt = 0.6;
        const fadeStart = this.sunTiltAltitude / 2;
        const fadeEnd = this.sunTiltAltitude;

        // Apply a smoothstep to interpolate between groundTilt and 1.0 (aligned with camera)
        const t = THREE.MathUtils.clamp((altitude - fadeStart) / (fadeEnd - fadeStart), 0, 1);
        const k = t * t * (3 - 2 * t);
        const effectiveTilt = THREE.MathUtils.lerp(groundTilt, 1.0, k);

        const newSunDirection = this._newSunDirection
            .copy(up).multiplyScalar(effectiveTilt)
            .addScaledVector(tangent, 1 - effectiveTilt)
            .normalize();

        // Only change sunDirection if the new direction is significantly different
        if (sunDirection.dot(newSunDirection) < 0.99995) {
            sunDirection.copy(newSunDirection);
        }
    }
}

export default SunLightLayer;
