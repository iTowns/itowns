import * as THREE from 'three';

// TODO regler le probleme glsl
import fontJS from './fonts/optimer_regular.json';

const font = new THREE.Font(JSON.parse(fontJS));
const size = new THREE.Vector3();

const points = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
];

class OBBHelper extends THREE.LineSegments {
    constructor(OBB, text) {
        const indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);
        const positions = new Float32Array(8 * 3);

        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const color = new THREE.Color(Math.random(), Math.random(), Math.random());

        super(geometry, new THREE.LineBasicMaterial({
            color: color.getHex(),
            linewidth: 3,
        }));

        this.frustumCulled = false;
        if (text) {
            OBB.box3D.getSize(size);

            var geometryText = new THREE.TextGeometry(text, {
                font,
                size: size.x * 0.0666,
                height: size.z * 0.001,
                curveSegments: 1,
            });

            this.textMesh = new THREE.Mesh(geometryText, new THREE.MeshBasicMaterial({
                color: new THREE.Color(1, 0, 0),
                side: THREE.DoubleSide,
            }));

            this.add(this.textMesh);
            this.textMesh.frustumCulled = false;
        }

        if (OBB !== undefined) {
            this.update(OBB);
        }
    }

    setMaterialVisibility(show) {
        this.material.visible = show;
        if (this.textMesh) {
            this.textMesh.material.visible = show;
        }
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

    update(OBB) {
        const position = this.geometry.attributes.position;
        const array = position.array;

        OBB.toPoints(points);
        let offset = 0;
        for (const pt of points) {
            pt.toArray(array, offset);
            offset += 3;
        }

        position.needsUpdate = true;
        this.updateMatrix();
        this.updateMatrixWorld(true);

        if (this.textMesh) {
            OBB.box3D.getSize(size);
            this.textMesh.position.set(0, 0, 0);
            this.textMesh.translateX(-size.x * 0.45);
            this.textMesh.translateY(-size.y * 0.45);
            this.textMesh.translateZ(size.z * 0.1);
        }
    }
}

export default OBBHelper;
