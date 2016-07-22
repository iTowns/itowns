/**
 * @author AD IGN
 * Class where we get the Intrinsic parameters of the system.
 */


import THREE from 'three';


var Sensor = function(infos) {
    this.infos = infos;
    this.position = new THREE.Vector3().fromArray(infos.position);
    this.rotation = new THREE.Matrix3().fromArray(infos.rotation);
    this.projection = new THREE.Matrix3().fromArray(infos.projection);
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
    this._itownsWay = new THREE.Matrix3().set(0, -1, 0,
        0, 0, -1,
        1, 0, 0);

    this.Photogram_JMM = new THREE.Matrix3().set(0, 0, -1, -1, 0, 0,
        0, 1, 0);

    this.photgramme_image = new THREE.Matrix3().set(1, 0, 0,
        0, -1, 0,
        0, 0, -1);

    this.rotation = this.getMatOrientationTotal();
    this.position.applyMatrix3(this._itownsWay);
};



Sensor.prototype.getDistortion_r2max = function(disto) {
    // returned the square of the smallest positive root of the derivativeof the distortion polynomial
    // which tells where the distortion might no longer be bijective.
    var roots = this.cardan_cubic_roots(7 * disto.z, 5 * disto.y, 3 * disto.x, 1);
    var imax = -1;
    for (var i in roots)
        if (roots[i] > 0 && (imax === -1 || roots[imax] > roots[i])) imax = i;
    if (imax === -1) return Infinity; // no roots : all is valid !
    return roots[imax];
};



// rotation * Photogram_JMM * getMatOrientationCapteur * photgramme_image
Sensor.prototype.getMatOrientationTotal = function() {

    var out = this.rotation.clone();
    out = new THREE.Matrix3().multiplyMatrices(out.clone(), this.Photogram_JMM.clone());

    out = new THREE.Matrix3().multiplyMatrices(out.clone(), this.getMatOrientationCapteur().clone());
    out = new THREE.Matrix3().multiplyMatrices(out.clone(), this.photgramme_image.clone());

    out = new THREE.Matrix3().multiplyMatrices(this._itownsWay, out.clone());
    return out;

};

Sensor.prototype.getMatOrientationCapteur = function() {

    var ori0 = new THREE.Matrix3().set(0, -1, 0,
        1, 0, 0,
        0, 0, 1);

    var ori1 = new THREE.Matrix3().set(0, 1, 0, -1, 0, 0,
        0, 0, 1);

    var ori2 = new THREE.Matrix3().set(-1, 0, 0,
        0, -1, 0,
        0, 0, 1);

    var ori3 = new THREE.Matrix3().set(1, 0, 0,
        0, 1, 0,
        0, 0, 1);

    switch (this.orientation) {
        case 0:
            return ori0;
        case 1:
            return ori1;
        case 2:
            return ori2;
        case 3:
            return ori3;
    }
};


Sensor.prototype.cardan_cubic_roots = function(a, b, c, d) {

    // http://fr.wikipedia.org/wiki/Methode_de_Cardan  Thanks Bredif
    var cardan_cubic_roots = function(a, b, c, d) {

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
            var r = 2 * Math.sqrt(-p / 3)
            return [
                r * Math.cos((kos) / 3) + vt,
                r * Math.cos((kos + Math.PI) / 3) + vt,
                r * Math.cos((kos + 2 * Math.PI) / 3) + vt
            ];
        }
    };

    var quadratic_roots = function(a, b, c) {
        var delta = b * b - 4 * a * c;
        if (delta < 0) return [];
        var x0 = -b / (2 * a);
        if (delta === 0) return [x0];
        var sqr_delta_2a = Math.sqrt(delta) / (2 * a);
        return [x0 - sqr_delta_2a, x0 + sqr_delta_2a];
    };

    var sgn = function(x) {
        return (x > 0) - (x < 0);
    };

    var cubic_root = function(x) {
        return sgn(x) * Math.pow(Math.abs(x), 1 / 3);
    };

    return cardan_cubic_roots(a, b, c, d);
};

export default Sensor;
