import * as THREE from 'three';

// TODO regler le probleme glsl
import fontJS from './fonts/optimer_regular.json';

const font = new THREE.Font(JSON.parse(fontJS));
const matText = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0, 0) });

class OBBHelper extends THREE.Box3Helper {
    constructor(OBB, text, color) {
        color = color || new THREE.Color(Math.random(), Math.random(), Math.random());

        super(OBB.box3D, color.getHex());

        this.obb = OBB;
        this.material.linewidth = 2;

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;

        if (text) {
            const geometryText = new THREE.TextGeometry(text, { font, curveSegments: 1 });

            this.textMesh = new THREE.Mesh(geometryText, matText);
            this.textMesh.rotateZ(Math.PI * 0.5);
            this.textMesh.scale.set(0.001, 0.001, 0.001);
            this.textMesh.position.set(0.9, 0.5, 1);
            this.textMesh.frustumCulled = false;
            this.add(this.textMesh);
        }

        this.updateMatrixWorld(true);
    }

    removeChildren() {
        this.material.dispose();
        this.geometry.dispose();
        if (this.textMesh) {
            if (Array.isArray(this.textMesh.material)) {
                for (const material of this.textMesh.material) {
                    material.dispose();
                }
            } else {
                this.textMesh.material.dispose();
            }
            this.textMesh.geometry.dispose();
            delete this.textMesh;
        }
    }

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
