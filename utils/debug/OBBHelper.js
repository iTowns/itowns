import * as THREE from 'three';


const vector3 = new THREE.Vector3();


class OBBHelper extends THREE.Box3Helper {
    constructor(OBB, text, color) {
        color = color || new THREE.Color(Math.random(), Math.random(), Math.random());

        super(OBB.box3D, color.getHex());

        this.obb = OBB;
        this.material.linewidth = 2;

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;

        this.updateMatrixWorld(true);
    }

    removeChildren() {
        this.material.dispose();
        this.geometry.dispose();
    }

    updateMatrixWorld(force = false) {
        if (this.obb.box3D.isEmpty()) {
            return;
        }

        // this.quaternion.copy(this.obb.quaternion);
        this.obb.getWorldQuaternion(this.quaternion);

        // this.obb.box3D.getCenter(this.position).applyQuaternion(this.quaternion).add(this.obb.position);
        this.obb.getWorldPosition(this.position);
        this.position.add(this.obb.box3D.getCenter(vector3).applyQuaternion(this.quaternion));

        this.obb.box3D.getSize(this.scale);

        this.scale.multiplyScalar(0.5);

        this.updateMatrix();

        THREE.Object3D.prototype.updateMatrixWorld.call(this, force);
    }
}

export default OBBHelper;
