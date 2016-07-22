/*
 * to add some general extension to THREE without modifying the lib directly
 *
 */

import THREE from 'three';


// mbredif: extend THREE.Matrix3 prototype to with some THREE.Matrix4 functionalities
THREE.Matrix3.prototype.fromArray = THREE.Matrix4.prototype.fromArray;

THREE.Matrix3.prototype.multiplyMatrices = function(a, b) {
    var ae = a.elements;
    var be = b.elements;
    var te = this.elements;

    var a11 = ae[0],
        a12 = ae[3],
        a13 = ae[6];
    var a21 = ae[1],
        a22 = ae[4],
        a23 = ae[7];
    var a31 = ae[2],
        a32 = ae[5],
        a33 = ae[8];

    var b11 = be[0],
        b12 = be[3],
        b13 = be[6];
    var b21 = be[1],
        b22 = be[4],
        b23 = be[7];
    var b31 = be[2],
        b32 = be[5],
        b33 = be[8];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;

    return this;

};

THREE.Matrix3.prototype.flattenToArray = function(flat) {

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

THREE.Matrix3.prototype.flattenToArrayOffset = function(flat, offset) {

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

THREE.Matrix3.prototype.makeRotationFromQuaternion = function(q) {

    var te = this.elements;

    var x = q.x,
        y = q.y,
        z = q.z,
        w = q.w;
    var x2 = x + x,
        y2 = y + y,
        z2 = z + z;
    var xx = x * x2,
        xy = x * y2,
        xz = x * z2;
    var yy = y * y2,
        yz = y * z2,
        zz = z * z2;
    var wx = w * x2,
        wy = w * y2,
        wz = w * z2;

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

THREE.Matrix3.prototype.fromMatrix4 = function(m) {

    //var out = this.elements;
    var c = m.elements;

    return new THREE.Matrix3().set(c[0], c[4], c[8], c[1], c[5], c[9], c[2], c[6], c[10]);

};
