import * as THREE from 'three';
import assert from 'assert';
import OrientationUtils from 'Utils/OrientationUtils';
import Coordinates from 'Core/Geographic/Coordinates';

// Asster two float number are equals, with 5 digits precision.
function assertFloatEqual(float1, float2, msg, precision = 15) {
    assert.equal(Number(float1).toFixed(precision), Number(float2).toFixed(precision), msg);
}
function quaternionToString(q) {
    return `quaternion : _x: ${q._x}, _y: ${q._y}, _z: ${q._z}, _w: ${q._w}`;
}
// Assert two quaternion objects are equals.
function assertQuatEqual(q1, q2, precision = 15, message = 'Quaternion comparaison') {
    try {
        assertFloatEqual(q1._x, q2._x, '_x not equal', precision);
        assertFloatEqual(q1._y, q2._y, '_y not equal', precision);
        assertFloatEqual(q1._z, q2._z, '_z not equal', precision);
        assertFloatEqual(q1._w, q2._w, '_w not equal', precision);
    } catch (e) {
        if (e instanceof assert.AssertionError) {
            assert.fail(`${message}\n${e}\nExpected : ${quaternionToString(q1)}\nActual : ${quaternionToString(q2)}`);
        } else {
            assert.fail(e);
        }
    }
}

function testQuaternionFromAttitude(input, expected, precision = 15) {
    var actual = OrientationUtils.quaternionFromAttitude(input);
    var message = `Input should be parsed properly : ${input}`;

    assertQuatEqual(expected, actual, precision, message);
}

function RollPitchHeadingToString() {
    return `roll: ${this.roll}, pitch: ${this.pitch}, heading: ${this.heading}}`;
}

function OmegaPhiKappaToString() {
    return `omega: ${this.omega}, phi: ${this.phi}, kappa: ${this.kappa}`;
}

describe('OrientationUtils quaternionFromAttitude', function () {
    it('should parse empty input', function () {
        var input = {};
        var expected = new THREE.Quaternion();
        testQuaternionFromAttitude(input, expected);
    });

    it('should parse roll pitch heading unity', function () {
        var input = {
            roll: 0,
            toString: RollPitchHeadingToString,
        };
        var expected = new THREE.Quaternion();

        testQuaternionFromAttitude(input, expected);
    });

    it('should parse roll', function () {
        var input = {
            roll: -180,
            toString: RollPitchHeadingToString,
        };
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

        testQuaternionFromAttitude(input, expected);
    });

    it('should parse pitch', function () {
        var input = {
            pitch: -180,
            toString: RollPitchHeadingToString,
        };
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

        testQuaternionFromAttitude(input, expected);
    });

    it('should parse heading', function () {
        var input = {
            heading: -180,
            toString: RollPitchHeadingToString,
        };

        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

        testQuaternionFromAttitude(input, expected);
    });

    it('should parse omega phi kappa', function () {
        var input = {
            omega: 0,
            phi: 0,
            kappa: 0,
            toString: OmegaPhiKappaToString,
        };

        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

        testQuaternionFromAttitude(input, expected);
    });
});

describe('OrientationUtils.quaternionFromCRSToCRS', function () {
    it('should set ENU quaternion from greenwich on ecuador', function () {
        var coord = new Coordinates('EPSG:4326', 0, 0);
        var input = {
            roll: 0,
            pitch: 0,
            heading: 0,
            toString() { return `roll: ${this.roll}, pitch: ${this.pitch}, heading: ${this.heading}`; },
        };

        var crs2crs = OrientationUtils.quaternionFromCRSToCRS('EPSG:4326', 'EPSG:4978')(coord);
        var attitude = OrientationUtils.quaternionFromAttitude(input);
        var actual = crs2crs.multiply(attitude);

        var expected = new THREE.Quaternion();
        expected.setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 2, 'YZX'));

        assertQuatEqual(expected, actual);
    });
});

describe('OrientationUtils.quaternionFromCRSToCRS', function () {
    it('should compute the identity quaternion from EPSG:4978 to itself', function () {
        var coord = new Coordinates('EPSG:4978', 0, 0, 0); // local frame is a geocent frame
        var actual = OrientationUtils.quaternionFromCRSToCRS('EPSG:4978', 'EPSG:4978', coord);

        var expected = new THREE.Quaternion();
        assertQuatEqual(expected, actual);
    });

    it('should compute the correct quaternion from EPSG:4326 to EPSG:4978 at lat=lon=0', function () {
        var coord = new Coordinates('EPSG:4326', 0, 0);
        var actual = OrientationUtils.quaternionFromCRSToCRS('EPSG:4326', 'EPSG:4978')(coord);

        var expected = new THREE.Quaternion();
        expected.setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 2, 'YZX'));
        assertQuatEqual(expected, actual);
    });
});



const RAD2DEG = THREE.MathUtils.RAD2DEG;
const axis = new THREE.Vector3().set(0, 0, 1);

// https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0060.pdf
describe('OrientationUtils.quaternionFromLCCToEnu', function () {
    it('should compute the correct meridian convergence 1/2', function () {
        var coord = new Coordinates('EPSG:4326', 0.0523598776 * RAD2DEG, 0.8796459430 * RAD2DEG);
        var proj = { lat0: Math.asin(0.7604059656), long0: 0.0407923443 };
        var actual = OrientationUtils.quaternionFromLCCToEnu(proj, coord);
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(axis, -0.008796);
        assertQuatEqual(expected, actual, 7);
    });

    it('should compute the correct meridian convergence 2/2', function () {
        var coord = new Coordinates('EPSG:4326', 0.1570796327 * RAD2DEG, 0.7330382858 * RAD2DEG);
        var proj = { lat0: Math.asin(0.6712679323), long0: 0.0407923443 };
        var actual = OrientationUtils.quaternionFromLCCToEnu(proj)(coord);
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(axis, -0.07806);
        assertQuatEqual(expected, actual, 7);
    });
});

// https://geodesie.ign.fr/contenu/fichiers/documentation/algorithmes/alg0061.pdf
describe('OrientationUtils.quaternionFromTMercToEnu', function () {
    it('should compute the correct meridian convergence 1/3', function () {
        var coord = new Coordinates('EPSG:4326', -0.0785398163 * RAD2DEG, 0.8552113335 * RAD2DEG);
        var proj = { e: 0.0818191910, long0: -0.0523598776 };
        var actual = OrientationUtils.quaternionFromTMercToEnu(proj, coord);
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(axis, 0.01976);
        assertQuatEqual(expected, actual, 6);
    });

    it('should compute the correct meridian convergence 2/3', function () {
        var coord = new Coordinates('EPSG:4326', 0.0523598776 * RAD2DEG, 0.837758041 * RAD2DEG);
        var proj = { e: 0.0818191910, long0: 0.0523598776 };
        var actual = OrientationUtils.quaternionFromTMercToEnu(proj)(coord);
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(axis, 0);
        assertQuatEqual(expected, actual, 6);
    });

    it('should compute the correct meridian convergence 3/3', function () {
        var coord = new Coordinates('EPSG:4326', 0.2094395102 * RAD2DEG, 0.872664626 * RAD2DEG);
        var proj = { e: 0.0818191910, long0: 0.1570796327 };
        var actual = OrientationUtils.quaternionFromTMercToEnu(proj)(coord);
        var expected = new THREE.Quaternion();
        expected.setFromAxisAngle(axis, -0.040125);
        assertQuatEqual(expected, actual, 6);
    });
});
