import * as THREE from 'three';
import proj4 from 'proj4';
import Coordinates from '../Core/Geographic/Coordinates';

/** @module OrientationUtils */

const DEG2RAD = THREE.Math.DEG2RAD;
const quaternionToEnu_cache = {};

export default {
    /**
     * The transform from the platform frame to the local East, North, Up (ENU) frame is
     * <pre>RotationZ(heading).RotationX(pitch).RotationY(roll)</pre>
     * @function quaternionFromRollPitchHeading
     * @param {Number} roll - angle in degrees
     * @param {Number} pitch - angle in degrees
     * @param {Number} heading - angle in degrees
     * @param {THREE.Quaternion} target output Quaternion
     * @returns {THREE.Quaternion} target
     */
    quaternionFromRollPitchHeading(roll = 0, pitch = 0, heading = 0, target = new THREE.Quaternion()) {
        roll *= DEG2RAD;
        pitch *= DEG2RAD;
        heading *= DEG2RAD;
        // return this.setFromEuler(new THREE.Euler(pitch, roll, heading , 'ZXY')).conjugate();
        return target.setFromEuler(new THREE.Euler(-pitch, -roll, -heading, 'YXZ')); // optimized version of above
    },

    /**
     * From DocMicMac, the transform from the platform frame to the local East, North, Up (ENU) frame is
     * <pre>
     * RotationX(omega).RotationY(phi).RotationZ(kappa).RotationX(PI)
     * RotationX(PI) <=> Quaternion(1,0,0,0) : converts between the 2 conventions for the camera local frame:
     * X right, Y bottom, Z front : convention in photogrammetry and computer vision
     * X right, Y top,    Z back  : convention in webGL, threejs
     * </pre>
     * @function quaternionFromOmegaPhiKappa
     * @param {Number} omega - angle in degrees
     * @param {Number} phi - angle in degrees
     * @param {Number} kappa - angle in degrees
     * @param {THREE.Quaternion} target output Quaternion
     * @returns {THREE.Quaternion} target
     */
    quaternionFromOmegaPhiKappa(omega = 0, phi = 0, kappa = 0, target = new THREE.Quaternion()) {
        omega *= DEG2RAD;
        phi *= DEG2RAD;
        kappa *= DEG2RAD;
        target.setFromEuler(new THREE.Euler(omega, phi, kappa, 'XYZ'));
        target.set(target.w, target.z, -target.y, -target.x); // <=> target.multiply(new THREE.Quaternion(1, 0, 0, 0));
        return target;
    },

    /**
     * Properties are either defined as (omega, phi, kappa) or as (roll, pitch, heading) or all undefined.
     * @typedef Attitude
     * @type {Object}
     * @property {Number} omega - angle in degrees
     * @property {Number} phi - angle in degrees
     * @property {Number} kappa - angle in degrees
     * @property {Number} roll - angle in degrees
     * @property {Number} pitch - angle in degrees
     * @property {Number} heading - angle in degrees
     */

    /**
     * Set the quaternion according to the rotation from the platform frame to the local frame
     * @function quaternionFromAttitude
     * @param {Attitude} attitude - [Attitude]{@link module:OrientedImageParser~Attitude}
     * @param {THREE.Quaternion} target output Quaternion
     * @returns {THREE.Quaternion} target
     */
    quaternionFromAttitude(attitude, target = new THREE.Quaternion()) {
        if ((attitude.roll !== undefined) || (attitude.pitch !== undefined) || (attitude.heading !== undefined)) {
            return this.quaternionFromRollPitchHeading(attitude.roll, attitude.pitch, attitude.heading, target);
        }
        if ((attitude.omega !== undefined) || (attitude.phi !== undefined) || (attitude.kappa !== undefined)) {
            return this.quaternionFromOmegaPhiKappa(attitude.omega, attitude.phi, attitude.kappa, target);
        }
        return target.set(0, 0, 0, 1);
    },

    /**
     * Set the quaternion according to the rotation from the East North Up (ENU) frame to the geocentric frame.
     * The up direction of the ENU frame is provided by the normalized geodetic normal of the provided coordinates (geodeticNormal property)
     * @function quaternionToEnuFromGeocent
     * @param {Object} proj (unused)
     * @param {Coordinates} coordinates - origin of the East North Up (ENU) frame
     * @param {THREE.Quaternion} target - output Quaternion
     * @returns {(THREE.Quaternion|function)} the modified target if coordinates is defined, or the curried function(target, coordinates) to later apply the function
     */
    quaternionToEnuFromGeocent(proj, coordinates, target = new THREE.Quaternion()) {
        const matrix = new THREE.Matrix4();
        const north = new THREE.Vector3();
        const east = new THREE.Vector3();
        const toEnuFromGeocent = (coordinates, target = new THREE.Quaternion()) => {
            const up = coordinates.geodesicNormal;
            if (up.x == 0 && up.y == 0) {
                return target.set(0, 0, 0, 1);
            }
            // this is an optimized version of matrix.lookAt(up, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
            east.set(-up.y, up.x, 0).normalize();
            north.crossVectors(up, east);
            matrix.makeBasis(east, north, up);
            return target.setFromRotationMatrix(matrix);
        };
        return coordinates ? toEnuFromGeocent(coordinates, target) : toEnuFromGeocent;
    },

    /**
     * Set the quaternion to correct for the meridian convergence of the East North Up (ENU) frame to the Lambert Conformal Conic (LCC) frame.
     * This is a generally small rotation around Z.
     * @function quaternionToEnuFromLCC
     * @param {Object} proj the lcc projection (may be parsed using proj4)
     * @param {Number} proj.lat0 - the latitude of origin
     * @param {Number} proj.long0 - the longitude of the central meridian
     * @param {Coordinates} coordinates - origin of the East North Up (ENU) frame
     * @param {THREE.Quaternion} target - output Quaternion
     * @returns {(THREE.Quaternion|function)} the modified target if coordinates is defined, or the curried function(target, coordinates) to later apply the function
    */
    quaternionToEnuFromLCC(proj, coordinates, target = new THREE.Quaternion()) {
        const sinlat0 = Math.sin(proj.lat0);
        const axis = new THREE.Vector3().set(0, 0, 1);
        const coord = new Coordinates('EPSG:4326', 0, 0, 0);
        const toEnuFromLCC = (coordinates, target = new THREE.Quaternion()) => {
            const long = coordinates.as(coord.crs, coord).longitude * DEG2RAD;
            return target.setFromAxisAngle(axis, sinlat0 * (proj.long0 - long));
        };
        return coordinates ? toEnuFromLCC(coordinates, target) : toEnuFromLCC;
    },

    /**
     * Set the quaternion to correct for the meridian convergence of the East North Up (ENU) frame to the Mercator frame.
     * This is a generally small rotation around Z.
     * @function quaternionToEnuFromMerc
     * @param {Object} proj the merc projection (may be parsed using proj4)
     * @param {Number} proj.e - the excentricity of the ellipsoid (supersedes {proj.a} and {proj.b})
     * @param {Number} proj.a - the semimajor radius of the ellipsoid axis
     * @param {Number} proj.b - the semiminor radius of the ellipsoid axis
     * @param {Number} proj.long0 - the longitude of the central meridian
     * @param {Coordinates} coordinates - origin of the East North Up (ENU) frame
     * @param {THREE.Quaternion} target - output Quaternion
     * @returns {(THREE.Quaternion|function)} the modified target if coordinates is defined, or the curried function(target, coordinates) to later apply the function
    */
    quaternionToEnuFromMerc(proj, coordinates, target = new THREE.Quaternion()) {
        const a2 = proj.a * proj.a;
        const b2 = proj.b * proj.b;
        const e2 = proj.e * proj.e;
        const eta0 = proj.e ? (e2 / (1 - e2)) : (a2 / b2 - 1);
        const axis = new THREE.Vector3().set(0, 0, 1);
        const coord = new Coordinates('EPSG:4326', 0, 0, 0);
        const toEnuFromMerc = (coordinates, target = new THREE.Quaternion()) => {
            coordinates.as(coord.crs, coord);
            const long = coord.longitude * DEG2RAD;
            const lat = coord.latitude * DEG2RAD;
            const dlong = proj.long0 - long;
            const coslat = Math.cos(lat);
            const sinlat = Math.sin(lat);
            const tanlat = sinlat / coslat;
            const coslat2 = coslat * coslat;
            const dl2 = dlong * dlong * coslat2;
            const eta2 = eta0 * coslat2;
            const gamma = dlong * sinlat * (1 + dl2 / 3 * (1 + 3 * eta2 + 2 * eta2 * eta2) + dl2 * dl2 * (2 - tanlat) / 15);
            return target.setFromAxisAngle(axis, gamma);
        };
        return coordinates ? toEnuFromMerc(coordinates, target) : toEnuFromMerc;
    },


    /**
     * Warns for an unimplemented projection, sets the quaternion to the identity (0,0,0,1).
     * @function quaternionToEnuFromDefault
     * @param {Object} proj the unimplemented projection (may be parsed using proj4)
     * @param {String} proj.projName - the projection name shown in the warning message
     * @param {Coordinates} coordinates -(unused)
     * @param {THREE.Quaternion} target - output Quaternion
     * @returns {(THREE.Quaternion|function)} the modified target if coordinates is defined, or the curried function(target, coordinates) to later apply the function
     */
    quaternionToEnuFromDefault(proj, coordinates, target = new THREE.Quaternion()) {
        console.warn('quaternionToEnuFromCRS is not implemented for projections of type', proj.projName);
        const toEnuFromDefault = (coordinates, target = new THREE.Quaternion()) => target.set(0, 0, 0, 1);
        return coordinates ? toEnuFromDefault(coordinates, target) : toEnuFromDefault;
    },

    /**
     * Compute the quaternion that models the rotation from the local East North Up (ENU) frame of the coordinates parameter to the frame of the given crs.
     * @function quaternionToEnuFromCRS
     * @param {String} crs the CRS of the target frame (default : the coordinates crs).
     * @param {Coordinates} coordinates - origin of the East North Up (ENU) frame
     * @param {THREE.Quaternion} target - output Quaternion
     * @returns {(THREE.Quaternion|function)} the modified target if coordinates is defined, or the curried function(target, coordinates) to later apply the function
     */
    quaternionToEnuFromCRS(crs, coordinates, target = new THREE.Quaternion()) {
        let toEnu = quaternionToEnu_cache[crs];
        if (!toEnu) {
            const proj = proj4.defs(crs);
            switch (proj.projName) {
                case 'geocent': toEnu = this.quaternionToEnuFromGeocent(proj); break;
                case 'lcc': toEnu = this.quaternionToEnuFromLCC(proj); break;
                case 'merc': toEnu = this.quaternionToEnuFromMerc(proj); break;
                default: toEnu = this.quaternionToEnuFromDefault(proj);
            }
            quaternionToEnu_cache[crs] = toEnu;
        }
        return coordinates ? toEnu(coordinates, target) : toEnu;
    },


    /**
     * Return the function that computes the quaternion that represents a rotation from coordinates in platform frame,
     * defined using an [attitude]{@link module:OrientationParser~Attitude}
     * relative to a local crsIn frame, to coordinates expressed in the target crsOut frame
     *
     * @function quaternionFromAttitudeAndCoordinates
     * @param {String} crsIn the CRS of the input frame.
     * @param {String} crsOut the CRS of the output frame
     * @param {Coordinates} origin the origin of the local East North Up (ENU) frame
     * @param {Attitude} attitude - [Attitude]{@link module:OrientationParser~Attitude}
     * @param {THREE.Quaternion} target output Quaternion
     * @returns {function} Quaternion representing the rotation from crsIn to crsOut

     origin, attitude, target = new THREE.Quaternion()
     */
    quaternionFromAttitudeAndCoordinates(crsIn, crsOut) {
        if (crsIn == crsOut) {
            return (origin, attitude, target = new THREE.Quaternion()) => this.quaternionFromAttitude(attitude, target);
        }

        // get rotations from the local East/North/Up (ENU) frame to both CRS.
        const toEnuIn = this.quaternionToEnuFromCRS(crsIn);
        const toEnuOut = this.quaternionToEnuFromCRS(crsOut);
        const quatEnuIn = new THREE.Quaternion();
        const quatEnuOut = new THREE.Quaternion();
        return (origin, attitude, target = new THREE.Quaternion()) => {
            this.quaternionFromAttitude(attitude, target);
            toEnuIn(origin, quatEnuIn);
            toEnuOut(origin, quatEnuOut);
            return target.premultiply(quatEnuIn.conjugate()).premultiply(quatEnuOut);
        };
    },
};
