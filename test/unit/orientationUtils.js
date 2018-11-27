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
function assertQuatEqual(q1, q2, message = 'Quaternion comparaison') {
    try {
        assertFloatEqual(q1._x, q2._x, '_x not equal');
        assertFloatEqual(q1._y, q2._y, '_y not equal');
        assertFloatEqual(q1._z, q2._z, '_z not equal');
        assertFloatEqual(q1._w, q2._w, '_w not equal');
    } catch (e) {
        if (e instanceof assert.AssertionError) {
            assert.fail(`${message}\n${e}\nExpected : ${quaternionToString(q1)}\nActual : ${quaternionToString(q2)}`);
        } else {
            assert.fail(e);
        }
    }
}

function testQuaternionFromAttitude(input, expected) {
    var actual = OrientationUtils.localQuaternionFromAttitude(input);
    var message = `Input should be parsed properly : ${input}`;

    assertQuatEqual(expected, actual, message);
}

function RollPitchHeadingToString() {
    return `roll: ${this.roll}, pitch: ${this.pitch}, heading: ${this.heading}}`;
}

function OmegaPhiKappaToString() {
    return `omega: ${this.omega}, phi: ${this.phi}, kappa: ${this.kappa}`;
}

describe('OrientationUtils localQuaternionFromAttitude', function () {
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


describe('OrientationUtils globeQuaternionFromAttitude', function () {
    it('should set ENU quaternion from greenwich on ecuador', function () {
        var coord = new Coordinates('EPSG:4326', 0, 0);
        var input = {
            roll: 0,
            pitch: 0,
            heading: 0,
            toString() { return `roll: ${this.roll}, pitch: ${this.pitch}, heading: ${this.heading}`; },
        };

        var actual = OrientationUtils.globeQuaternionFromAttitude(input, coord);

        var expected = new THREE.Quaternion();
        expected.setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 2, 'YZX'));

        assertQuatEqual(expected, actual);
    });
});

describe('OrientationUtils parser', function () {
    it('should parse most simple empty data', function () {
        var properties = {};
        var coord; // coord is undefined because it's not used when applyRotationForGlobe is false.
        var applyRotationForGlobeView = false;

        var actual = OrientationUtils.quaternionFromAttitude(properties, coord, applyRotationForGlobeView);

        var expected = new THREE.Quaternion();
        assertQuatEqual(expected, actual);
    });

    it('should parse simple data in globe crs', function () {
        var properties = {};
        var coord = new Coordinates('EPSG:4326', 0, 0);
        var applyRotationForGlobeView = true;

        var actual = OrientationUtils.quaternionFromAttitude(properties, coord, applyRotationForGlobeView);

        var expected = new THREE.Quaternion();
        expected.setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI / 2, 'YZX'));
        assertQuatEqual(expected, actual);
    });
});

