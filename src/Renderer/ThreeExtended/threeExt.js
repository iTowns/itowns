/*
 * to add some general extension to THREE without modifying the lib directly
 *
 */

import * as THREE from 'three';


// mbredif: extend THREE.Matrix3 prototype to with some THREE.Matrix4 functionalities
THREE.Matrix3.prototype.fromArray = THREE.Matrix4.prototype.fromArray;

THREE.Matrix3.prototype.flattenToArray = function flattenToArray(flat) {
    var te = this.elements;
    flat[0] = te[0];
    flat[1] = te[1];
    flat[2] = te[2];
    flat[3] = te[3];
    flat[4] = te[4];
    flat[5] = te[5];
    flat[6] = te[6];
    flat[7] = te[7];
    flat[8] = te[8];

    return flat;
};

THREE.Matrix3.prototype.flattenToArrayOffset = function flattenToArrayOffset(flat, offset) {
    var te = this.elements;
    flat[offset] = te[0];
    flat[offset + 1] = te[1];
    flat[offset + 2] = te[2];

    flat[offset + 3] = te[3];
    flat[offset + 4] = te[4];
    flat[offset + 5] = te[5];

    flat[offset + 6] = te[6];
    flat[offset + 7] = te[7];
    flat[offset + 8] = te[8];

    return flat;
};

THREE.Matrix3.prototype.makeRotationFromQuaternion = function makeRotationFromQuaternion(q) {
    var te = this.elements;

    const x = q.x;
    const y = q.y;
    const z = q.z;
    const w = q.w;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    te[0] = 1 - (yy + zz);
    te[3] = xy - wz;
    te[6] = xz + wy;

    te[1] = xy + wz;
    te[4] = 1 - (xx + zz);
    te[7] = yz - wx;

    te[2] = xz - wy;
    te[5] = yz + wx;
    te[8] = 1 - (xx + yy);

    return this;
};

THREE.Matrix3.prototype.fromMatrix4 = function fromMatrix4(m) {
    // var out = this.elements;
    var c = m.elements;

    return new THREE.Matrix3().set(c[0], c[4], c[8], c[1], c[5], c[9], c[2], c[6], c[10]);
};
