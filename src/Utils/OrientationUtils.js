import * as THREE from 'three';

/** @module OrientationUtils */

const DEG2RAD = THREE.Math.DEG2RAD;

// The transform from world to local is  RotationZ(heading).RotationX(pitch).RotationY(roll)
// The transform from local to world is (RotationZ(heading).RotationX(pitch).RotationY(roll)).transpose()
function quaternionFromRollPitchHeading(roll = 0, pitch = 0, heading = 0, target) {
    roll *= DEG2RAD;
    pitch *= DEG2RAD;
    heading *= DEG2RAD;
    // return this.setFromEuler(new THREE.Euler(pitch, roll, heading , 'ZXY')).conjugate();
    return target.setFromEuler(new THREE.Euler(-pitch, -roll, -heading, 'YXZ')); // optimized version of above
}

// From DocMicMac, the transform from local to world is:
// RotationX(omega).RotationY(phi).RotationZ(kappa).RotationX(PI)
// RotationX(PI) = Scale(1, -1, -1) converts between the 2 conventions for the camera local frame:
//  X right, Y bottom, Z front : convention in webGL, threejs and computer vision
//  X right, Y top,    Z back  : convention in photogrammetry
function quaternionFromOmegaPhiKappa(omega = 0, phi = 0, kappa = 0, target) {
    omega *= DEG2RAD;
    phi *= DEG2RAD;
    kappa *= DEG2RAD;
    target.setFromEuler(new THREE.Euler(omega, phi, kappa, 'XYZ'));
    // target.setFromRotationMatrix(new THREE.Matrix4().makeRotationFromQuaternion(target).scale(new THREE.Vector3(1, -1, -1)));
    target.set(target.w, target.z, -target.y, -target.x); // optimized version of above
    return target;
}

// Set East North Up Orientation from geodesic normal
// target - the quaternion to set
// up - the normalized geodetic normal to the ellipsoid (given by Coordinates.geodeticNormal)
var quaternionENUFromGeodesicNormal = (() => {
    const matrix = new THREE.Matrix4();
    const elements = matrix.elements;
    const north = new THREE.Vector3();
    const east = new THREE.Vector3();
    return function setENUFromGeodesicNormal(up, target = new THREE.Quaternion()) {
        // this is an optimized version of matrix.lookAt(up, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        east.set(-up.y, up.x, 0);
        east.normalize();
        north.crossVectors(up, east);
        elements[0] = east.x; elements[4] = north.x; elements[8] = up.x;
        elements[1] = east.y; elements[5] = north.y; elements[9] = up.y;
        elements[2] = east.z; elements[6] = north.z; elements[10] = up.z;
        return target.setFromRotationMatrix(matrix);
    };
})();

/**
 *
 * @typedef Attitude
 * @type {Object}
 *
 * @property {Number} omega - angle in degrees
 * @property {Number} phi - angle in degrees
 * @property {Number} kappa - angle in degrees
 * @property {Number} roll - angle in degrees
 * @property {Number} pitch - angle in degrees
 * @property {Number} heading - angle in degrees
 */


const ENUQuat = new THREE.Quaternion();

/**
 * @module OrientationUtils
 */
export default {
    /**
     * @param {Attitude} attitude - [Attitude]{@link module:OrientationParser~Attitude}
     * with properties: (omega, phi, kappa), (roll, pitch, heading) or none.
     * Note that convergence of the meridians is not taken into account.
     * @param {THREE.Quaternion} target Quaternion to set
     *
     * @return {THREE.Quaternion} Quaternion representing the rotation
     */
    localQuaternionFromAttitude(attitude, target = new THREE.Quaternion()) {
        if ((attitude.roll !== undefined) || (attitude.pitch !== undefined) || (attitude.heading !== undefined)) {
            return quaternionFromRollPitchHeading(attitude.roll, attitude.pitch, attitude.heading, target);
        }
        if ((attitude.omega !== undefined) || (attitude.phi !== undefined) || (attitude.kappa !== undefined)) {
            return quaternionFromOmegaPhiKappa(attitude.omega, attitude.phi, attitude.kappa, target);
        }
        return target.set(0, 0, 0, 1);
    },

    /**
     * @param {Attitude} attitude - [Attitude]{@link module:OrientationParser~Attitude}
     * with properties: (omega, phi, kappa), (roll, pitch, heading) or none.
     * @param {Coordinates} coordinate position on the globe
     * @param {THREE.Quaternion} target Quaternion to set
     *
     * @return {THREE.Quaternion} Quaternion representing the rotation
     */
    globeQuaternionFromAttitude(attitude, coordinate, target = new THREE.Quaternion()) {
        quaternionENUFromGeodesicNormal(coordinate.geodesicNormal, ENUQuat);
        this.localQuaternionFromAttitude(attitude, target);
        target.premultiply(ENUQuat);
        return target;
    },

    /** Read rotation information (roll pitch heading or omega phi kappa),
     * Create a ThreeJs quaternion representing a rotation.
     *
     * @param {Attitude} attitude - [Attitude]{@link module:OrientationParser~Attitude}
     * @param {Coordinates} coordinate position the oject (used to apply another rotation on Globe CRS)
     * @param {Boolean} needsENUFromGeodesicNormal should be true on globe CRS.
     * If true, we will apply another rotation : The rotation use to create ENU local space at coordinate parameter position.
     * @param {THREE.Quaternion} target Quaternion to set
     *
     * @return {THREE.Quaternion} Quaternion representing the rotation
     */
    quaternionFromAttitude(attitude, coordinate, needsENUFromGeodesicNormal, target = new THREE.Quaternion()) {
        if (needsENUFromGeodesicNormal) {
            return this.globeQuaternionFromAttitude(attitude, coordinate, target);
        } else {
            return this.localQuaternionFromAttitude(attitude, target);
        }
    },
};
