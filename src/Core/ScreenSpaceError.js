import * as THREE from 'three';

const v = new THREE.Vector3();
const m = new THREE.Matrix4();
const m2 = new THREE.Matrix4();
const m3 = new THREE.Matrix4();
const basis = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
];

function computeVectorSizeAtDistance(vector, matrix, camera, distance, _3d) {
    basis[0].set(vector.x, 0, 0);
    basis[1].set(0, vector.y, 0);

    if (_3d) {
        basis.push(new THREE.Vector3(0, 0, vector.z));
    }

    m2.identity();
    m2.extractRotation(matrix);
    m3.identity();
    m3.extractRotation(camera.camera3D.matrixWorldInverse);

    for (const b of basis) {
        // Apply rotation
        b.applyMatrix4(m2);
        // Apply inverse camera rotation
        b.applyMatrix4(m3);
        // Move at 'distance' from camera
        b.z += -distance;
        // Project on screen
        b.applyMatrix4(camera.camera3D.projectionMatrix);
        // cancel z component
        b.z = 0;
        b.x = b.x * camera.width * 0.5;
        b.y = b.y * camera.height * 0.5;
    }

    const lengthsq = basis.map(b => b.lengthSq());
    const min = Math.min.apply(Math, lengthsq);
    return Math.sqrt(min);
}

function findBox3Distance(camera, box3, matrix) {
    // TODO: can be cached
    m.getInverse(matrix);
    // Move camera position in box3 basis
    // (we don't transform box3 to camera basis because box3 are AABB)
    const pt = camera.camera3D.position
        .clone(v).applyMatrix4(m);
    // Compute distance between the camera / box3
    return box3.distanceToPoint(pt);
}

function computeSizeFromGeometricError(box3, geometricError) {
    const size = box3.getSize();
    // Build a vector with the same ratio than box3,
    // and with the biggest component being geometricError
    size.multiplyScalar(geometricError /
        Math.max(size.x, Math.max(size.y, size.z)));
    return size;
}

export default {
    /*
     * Compute SSE based on the 2D bounding-box (ignore z size)
     */
    MODE_2D: 1,

    /*
     * Compute SSE based on the 3D bounding-box
     */
    MODE_3D: 2,

    computeFromBox3(camera, box3, matrix, geometricError, mode) {
        const distance = findBox3Distance(camera, box3, matrix);

        if (distance <= geometricError) {
            return {
                sse: Infinity,
                distance,
            };
        }

        const size = computeSizeFromGeometricError(box3, geometricError);

        const sse = computeVectorSizeAtDistance(size, matrix, camera, distance, mode == this.MODE_3D);

        return {
            sse,
            distance,
            size,
        };
    },

    computeFromSphere(camera, sphere, matrix, geometricError) {
        const s = sphere.clone().applyMatrix4(matrix);
        const distance = Math.max(0.0, s.distanceToPoint(camera.camera3D.position));
        basis[0].set(geometricError, 0, -distance);
        basis[0].applyMatrix4(camera.camera3D.projectionMatrix);
        basis[0].x = basis[0].x * camera.width * 0.5;
        basis[0].y = basis[0].y * camera.height * 0.5;
        basis[0].z = 0;

        return basis[0].length();
    },
};
