/**
 * @author AD IGN
 * Class where we get the Intrinsic parameters of the system.
 */


import * as THREE from 'three';

export function multiplyMatrices3x3(a, b, out) {
    var ae = a.elements;
    var be = b.elements;
    var te = out.elements;

    const a11 = ae[0];
    const a12 = ae[3];
    const a13 = ae[6];
    const a21 = ae[1];
    const a22 = ae[4];
    const a23 = ae[7];
    const a31 = ae[2];
    const a32 = ae[5];
    const a33 = ae[8];

    const b11 = be[0];
    const b12 = be[3];
    const b13 = be[6];
    const b21 = be[1];
    const b22 = be[4];
    const b23 = be[7];
    const b31 = be[2];
    const b32 = be[5];
    const b33 = be[8];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;
}

const Sensor = function Sensor(infos) {
    this.infos = infos;
    this.position = new THREE.Vector3().fromArray(infos.position);
    this.rotation = new THREE.Matrix3().fromArray(infos.rotation);

    // cameraCalibration projection is *row-major*
    this.projection = new THREE.Matrix3().fromArray(infos.projection);
    // but fromArray expects a column major -> transpose


    // we assume that the same is true for rotation -> transpose as well
    // TODO this.projection.transpose();
    // TODO this.rotation.transpose();

    this.size = new THREE.Vector2().fromArray(infos.size);
    if (infos.distortion) {
        this.pps = new THREE.Vector2().fromArray(infos.distortion.pps);
        var disto = new THREE.Vector3().fromArray(infos.distortion.poly357);
        var r2max = this.getDistortion_r2max(disto);
        this.distortion = new THREE.Vector4(disto.x, disto.y, disto.z, r2max);
    }
    this.mask = infos.mask;

    // change conventions
    this.orientation = infos.orientation;
    this._itownsWay = new THREE.Matrix3().set(
         0, -1, 0,
         0, 0, -1,
         1, 0, 0);
    // TODO this._itownsWay.transpose();

    this.Photogram_JMM = new THREE.Matrix3().set(
        0, 0, -1,
        -1, 0, 0,
        0, 1, 0);
    // TODO this.Photogram_JMM.transpose();

    this.photgramme_image = new THREE.Matrix3().set(
        1, 0, 0,
        0, -1, 0,
        0, 0, -1);
    // TODO this.photgramme_image.transpose();


    this.rotation = this.getMatOrientationTotal();
    this.position.applyMatrix3(this._itownsWay);
};


Sensor.prototype.getDistortion_r2max = function getDistortion_r2max(disto) {
    // returned the square of the smallest positive root of the derivativeof the distortion polynomial
    // which tells where the distortion might no longer be bijective.
    var roots = this.cardan_cubic_roots(7 * disto.z, 5 * disto.y, 3 * disto.x, 1);
    var imax = -1;
    for (var i in roots)
        { if (roots[i] > 0 && (imax === -1 || roots[imax] > roots[i])) imax = i; }
    if (imax === -1) return Infinity; // no roots : all is valid !
    return roots[imax];
};


// itowns * rotation * Photogram_JMM * getMatOrientationCapteur * photgramme_image
Sensor.prototype.getMatOrientationTotal = function getMatOrientationTotal() {
    // return this.rotation;
    let out = new THREE.Matrix3();

    out = this.rotation.clone();
    multiplyMatrices3x3(out.clone(), this.Photogram_JMM.clone(), out);
    multiplyMatrices3x3(out.clone(), this.getMatOrientationCapteur().clone(), out);
    multiplyMatrices3x3(out.clone(), this.photgramme_image.clone(), out);
    multiplyMatrices3x3(this._itownsWay, out.clone(), out);
    return out;


    multiplyMatrices3x3(this.photgramme_image, out, out);
    // multiplyMatrices3x3(out, this.getMatOrientationCapteur(), out);
    // multiplyMatrices3x3(out, this.Photogram_JMM, out);
    multiplyMatrices3x3(out, this.rotation, out);
    multiplyMatrices3x3(out, this._itownsWay, out);
    return out;
    //multiplyMatrices3x3(this.rotation, this._itownsWay, out);

    if (1) {
        // return this.rotation;
        multiplyMatrices3x3(this._itownsWay, this.rotation, out);
    } else if (0) {

    //return this.rotation;
    multiplyMatrices3x3(this.rotation, this._itownsWay, out);
    //multiplyMatrices3x3(this.photgramme_image, out, out);
    //multiplyMatrices3x3(this.getMatOrientationCapteur(), out, out);
    //multiplyMatrices3x3(this.wut, out, out);
    //multiplyMatrices3x3(this.Photogram_JMM, out, out);
    } else if (1) {
        multiplyMatrices3x3(out, this.photgramme_image, out);
        multiplyMatrices3x3(out, this.getMatOrientationCapteur(), out);
        multiplyMatrices3x3(out, this.Photogram_JMM, out);
        multiplyMatrices3x3(out, this.rotation, out);
        multiplyMatrices3x3(out, this._itownsWay, out);
    } else if (1) {
        multiplyMatrices3x3(this.photgramme_image, out, out);
        multiplyMatrices3x3(this.getMatOrientationCapteur(), out, out);
        multiplyMatrices3x3(this.Photogram_JMM, out, out);
        multiplyMatrices3x3(this.rotation, out, out);
        multiplyMatrices3x3(this._itownsWay, out, out);

    } else {
        multiplyMatrices3x3(this.rotation.clone(), this.Photogram_JMM, out);
        multiplyMatrices3x3(out, this.getMatOrientationCapteur(), out);
        multiplyMatrices3x3(out, this.photgramme_image, out);
        multiplyMatrices3x3(out, this._itownsWay, out);
    }
    return out;
};

Sensor.prototype.getMatOrientationCapteur = function getMatOrientationCapteur() {
    var ori0 = new THREE.Matrix3().set(0, -1, 0,
        1, 0, 0,
        0, 0, 1); // TODO .transpose()
    var ori1 = new THREE.Matrix3().set(0, 1, 0, -1, 0, 0,
        0, 0, 1); // TODO .transpose()

    var ori2 = new THREE.Matrix3().set(-1, 0, 0,
        0, -1, 0,
        0, 0, 1); // TODO .transpose()

    var ori3 = new THREE.Matrix3().set(1, 0, 0,
        0, 1, 0,
        0, 0, 1); // TODO .transpose()

    switch (this.orientation) {
        case 0:
            return ori0;
        case 1:
            return ori1;
        case 2:
            return ori2;
        case 3:
        default:
            return ori3;
    }
};


Sensor.prototype.cardan_cubic_roots = function cardan_cubic_roots(a, b, c, d) {
    // http://fr.wikipedia.org/wiki/Methode_de_Cardan  Thanks Bredif
    var cardan_cubic_roots = function cardan_cubic_roots(a, b, c, d) {
        if (a === 0) return quadratic_roots(b, c, d);
        var vt = -b / (3 * a);
        var a2 = a * a;
        var b2 = b * b;
        var a3 = a * a2;
        var b3 = b * b2;
        var p = c / a - b2 / (3 * a2);
        var q = b3 / (a3 * 13.5) + d / a - b * c / (3 * a2);
        if (p === 0) {
            var x = cubic_root(-q) + vt;
            return [x, x, x];
        }
        var p3_4_27 = p * p * p * 4 / 27;
        var del = q * q + p3_4_27;

        if (del > 0) {
            var sqrt_del = Math.sqrt(del);
            var u = cubic_root((-q + sqrt_del) / 2);
            var v = cubic_root((-q - sqrt_del) / 2);
            return [u + v + vt];
        } else if (del === 0) {
            var z0 = 3 * q / p;
            var x0 = vt + z0;
            var x12 = vt - z0 * 0.5;
            return [x0, x12, x12];
        } else // (del < 0)
        {
            var kos = Math.acos(-q / Math.sqrt(p3_4_27));
            var r = 2 * Math.sqrt(-p / 3);
            return [
                r * Math.cos((kos) / 3) + vt,
                r * Math.cos((kos + Math.PI) / 3) + vt,
                r * Math.cos((kos + 2 * Math.PI) / 3) + vt,
            ];
        }
    };

    var quadratic_roots = function quadratic_roots(a, b, c) {
        var delta = b * b - 4 * a * c;
        if (delta < 0) return [];
        var x0 = -b / (2 * a);
        if (delta === 0) return [x0];
        var sqr_delta_2a = Math.sqrt(delta) / (2 * a);
        return [x0 - sqr_delta_2a, x0 + sqr_delta_2a];
    };

    var sgn = function sgn(x) {
        return (x > 0) - (x < 0);
    };

    var cubic_root = function cubic_root(x) {
        return sgn(x) * Math.pow(Math.abs(x), 1 / 3);
    };

    return cardan_cubic_roots(a, b, c, d);
};

export default Sensor;
