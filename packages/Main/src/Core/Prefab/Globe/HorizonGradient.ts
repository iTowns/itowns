import * as THREE from 'three';
import { ellipsoidSizes } from '@itowns/geographic';
import vertexShader from 'Core/Prefab/Globe/Shaders/HorizonGradientVS.glsl';
import fragmentShader from 'Core/Prefab/Globe/Shaders/HorizonGradientFS.glsl';
import GlobeView from 'Core/Prefab/GlobeView';

const geodeticUp = new THREE.Vector3();

/**
 * Screen-space atmospheric horizon band rendered as a full-screen quad.
 *
 * This helper draws a soft gradient near the geometric horizon to visually
 * blend ground fog into the sky.
 *
 * Notes:
 * - Based on `ellipsoidSizes`.
 * - It relies on scene fog color (`view.scene.fog`).
 * - It is rendered late (`renderOrder = 999`) as a transparent pass.
 */
class HorizonGradient {
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

    constructor(scene: THREE.Scene) {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                fogColor: { value: new THREE.Color() },
                groundColor: { value: new THREE.Color(0x000000) },
                sinHorizon: { value: 0.0 },
                bandHalfWidth: { value: 0.04 },
                geodeticUp: { value: new THREE.Vector3() },
                uProjectionMatrixInverse: { value: new THREE.Matrix4() },
            },
            vertexShader,
            fragmentShader,
            depthTest: true,
            depthWrite: true,
            transparent: true,
            blending: THREE.NormalBlending,
        });

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            material,
        );

        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 999;
        this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
            material.uniforms.uProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
        };

        scene.add(this.mesh);
    }

    /*
     * Updates shader uniforms from the current globe camera and fog state.
     */
    update(view: GlobeView, fogSpreadValue: number) {
        if (!this.mesh) { return; }

        const fog = view.scene.fog as THREE.Fog | null;
        if (!fog || !this.mesh.visible) { return; }

        const uniforms = this.mesh.material.uniforms;
        uniforms.fogColor.value.copy(fog.color);

        // Geodetic surface normal: (x/a², y/a², z/b²) normalized
        const pos = view.camera3D.position;
        const a = ellipsoidSizes.x;
        const b = ellipsoidSizes.z;
        const a2 = a * a;
        const b2 = b * b;
        geodeticUp.set(pos.x / a2, pos.y / a2, pos.z / b2).normalize();

        // Geodetic altitude: distance from camera to ellipsoid along the normal
        const nx = geodeticUp.x;
        const ny = geodeticUp.y;
        const nz = geodeticUp.z;
        const surfaceR = 1.0 / Math.sqrt((nx * nx + ny * ny) / a2 + (nz * nz) / b2);
        const hGeo = Math.max(0, pos.dot(geodeticUp) - surfaceR);

        // Depression angle from horizontal to the geometric horizon
        uniforms.sinHorizon.value = -Math.sqrt(hGeo * (2 * surfaceR + hGeo)) / (surfaceR + hGeo);

        // Band width scales with fog spread
        // Scaling value was determined experimentally
        uniforms.bandHalfWidth.value = fogSpreadValue * 0.08;

        uniforms.geodeticUp.value.copy(geodeticUp);
    }

    get visible() {
        return this.mesh.visible;
    }

    set visible(visible: boolean) {
        this.mesh.visible = visible;
    }
}

export default HorizonGradient;
