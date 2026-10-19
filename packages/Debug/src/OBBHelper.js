import * as THREE from 'three';
/**
 * @category Debug
 */

class OBBHelper extends THREE.Box3Helper {
    constructor(OBB, color) {
        color = color || new THREE.Color(Math.random(), Math.random(), Math.random());

        super(OBB.box3D, color.getHex());

        this.obb = OBB;
        this.material.linewidth = 2;

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;

        this.updateMatrixWorld(true);
    }

    /**
     * Recomputes this helper's world matrix from the wrapped OBB.
     *
     * @param {boolean} force - Recompute the world matrix even if it is not
     * flagged as needing an update.
     */
    updateMatrixWorld(force = false) {
        if (this.obb.box3D.isEmpty()) {
            return;
        }

        this.quaternion.copy(this.obb.quaternion);

        this.obb.box3D.getCenter(this.position).applyQuaternion(this.quaternion).add(this.obb.position);

        this.obb.box3D.getSize(this.scale);

        this.scale.multiplyScalar(0.5);

        this.updateMatrix();

        THREE.Object3D.prototype.updateMatrixWorld.call(this, force);
    }
}

export default OBBHelper;
