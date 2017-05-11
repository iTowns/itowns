/**
 * Generated On: 2015-10-5
 * Class: Coordinates
 * Description: Coordonnées cartographiques
 */

import * as THREE from 'three';
import proj4 from 'proj4';
import mE from '../Math/MathExtended';
import Ellipsoid from '../Math/Ellipsoid';

export function ellipsoidSizes() {
    return {
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137,
    };
}

const ellipsoid = new Ellipsoid(ellipsoidSizes());

export const UNIT = {
    RADIAN: 0,
    DEGREE: 1,
    METER: 2,
};

function _unitFromProj4Unit(projunit) {
    if (projunit === 'degrees') {
        return UNIT.DEGREE;
    } else if (projunit === 'm') {
        return UNIT.METER;
    } else if (projunit === 'radians') {
        return UNIT.RADIAN;
    } else {
        return undefined;
    }
}

export function crsToUnit(crs) {
    switch (crs) {
        case 'EPSG:4326' : return UNIT.DEGREE;
        case 'EPSG:4978' : return UNIT.METER;
        default: {
            const p = proj4.defs(crs);
            if (!p) {
                return undefined;
            }
            return _unitFromProj4Unit(p.units);
        }
    }
}

function _crsToUnitWithError(crs) {
    const u = crsToUnit(crs);
    if (crs === undefined || u === undefined) {
        throw new Error(`Invalid crs paramater value '${crs}'`);
    }
    return u;
}

export function assertCrsIsValid(crs) {
    _crsToUnitWithError(crs);
}

export function crsIsGeographic(crs) {
    return (_crsToUnitWithError(crs) != UNIT.METER);
}

export function crsIsGeocentric(crs) {
    return (_crsToUnitWithError(crs) == UNIT.METER);
}

function _assertIsGeographic(crs) {
    if (!crsIsGeographic(crs)) {
        throw new Error(`Can't query crs ${crs} long/lat`);
    }
}

function _assertIsGeocentric(crs) {
    if (!crsIsGeocentric(crs)) {
        throw new Error(`Can't query crs ${crs} x/y/z`);
    }
}

// Only support explicit conversions
function _convert(coordsIn, newCrs) {
    if (newCrs === coordsIn.crs) {
        const refUnit = crsToUnit(newCrs);
        if (coordsIn._internalStorageUnit != refUnit) {
            // custom internal unit
            if (coordsIn._internalStorageUnit == UNIT.DEGREE && refUnit == UNIT.RADIAN) {
                return new Coordinates(newCrs, ...coordsIn._values.map(x => mE.degToRad(x)));
            } else if (coordsIn._internalStorageUnit == UNIT.RADIAN && refUnit == UNIT.DEGREE) {
                return new Coordinates(newCrs, ...coordsIn._values.map(x => mE.radToDeg(x)));
            }
        } else {
            // No need to create a new object as Coordinates objects are mostly
            // immutable (there's no .setLongitude() method etc)
            return coordsIn;
        }
    } else {
        if (coordsIn.crs === 'EPSG:4326' && newCrs === 'EPSG:4978') {
            const cartesian = ellipsoid.cartographicToCartesian(coordsIn);
            return new Coordinates(newCrs,
                                   cartesian.x, cartesian.y, cartesian.z);
        }

        if (coordsIn.crs === 'EPSG:4978' && newCrs === 'EPSG:4326') {
            const geo = ellipsoid.cartesianToCartographic({
                x: coordsIn._values[0],
                y: coordsIn._values[1],
                z: coordsIn._values[2],
            });
            return new Coordinates(newCrs, geo.longitude, geo.latitude, geo.h);
        }

        if (coordsIn.crs in proj4.defs && newCrs in proj4.defs) {
            const p = proj4(coordsIn.crs, newCrs, [coordsIn._values[0], coordsIn._values[1]]);
            return new Coordinates(newCrs,
                                   p[0],
                                   p[1],
                                   coordsIn._values[2]);
        }

        throw new Error(`Cannot convert from crs ${coordsIn.crs} (unit=${coordsIn._internalStorageUnit}) to ${newCrs}`);
    }
}

export function convertValueToUnit(unitIn, unitOut, value) {
    if (unitOut == undefined || unitIn == unitOut) {
        return value;
    } else {
        if (unitIn == UNIT.DEGREE && unitOut == UNIT.RADIAN) {
            return mE.degToRad(value);
        }
        if (unitIn == UNIT.RADIAN && unitOut == UNIT.DEGREE) {
            return mE.radToDeg(value);
        }
        throw new Error(`Cannot convert from unit ${unitIn} to ${unitOut}`);
    }
}

/**
 * Build a Coordinates object, given a crs and a number of coordinates value.
 * crs parameter can currently only be WGS84
 */
function Coordinates(crs, ...coordinates) {
    _crsToUnitWithError(crs);
    this.crs = crs;
    this._values = new Float64Array(3);

    if (coordinates.length == 1 && coordinates[0] instanceof THREE.Vector3) {
        this._values[0] = coordinates[0].x;
        this._values[1] = coordinates[0].y;
        this._values[2] = coordinates[0].z;
    } else {
        for (let i = 0; i < coordinates.length && i < 3; i++) {
            this._values[i] = coordinates[i];
        }
        for (let i = coordinates.length; i < 3; i++) {
            this._values[i] = 0;
        }
    }
    this._internalStorageUnit = crsToUnit(crs);
}

Coordinates.prototype.clone = function clone() {
    const r = new Coordinates(this.crs, ...this._values);
    r._internalStorageUnit = this._internalStorageUnit;
    return r;
};

Coordinates.prototype.longitude = function longitude(unit) {
    _assertIsGeographic(this.crs);
    return convertValueToUnit(this._internalStorageUnit, unit, this._values[0]);
};

Coordinates.prototype.latitude = function latitude(unit) {
    _assertIsGeographic(this.crs);
    return convertValueToUnit(this._internalStorageUnit, unit, this._values[1]);
};

Coordinates.prototype.altitude = function altitude() {
    _assertIsGeographic(this.crs);
    return this._values[2];
};

Coordinates.prototype.setAltitude = function setAltitude(altitude) {
    _assertIsGeographic(this.crs);
    this._values[2] = altitude;
};

Coordinates.prototype.x = function x() {
    _assertIsGeocentric(this.crs);
    return this._values[0];
};

Coordinates.prototype.y = function y() {
    _assertIsGeocentric(this.crs);
    return this._values[1];
};

Coordinates.prototype.z = function z() {
    _assertIsGeocentric(this.crs);
    return this._values[2];
};

Coordinates.prototype.xyz = function xyz() {
    _assertIsGeocentric(this.crs);
    const v = new THREE.Vector3();
    v.fromArray(this._values);
    return v;
};

Coordinates.prototype.as = function as(crs) {
    if (crs === undefined || !crsToUnit(crs)) {
        throw new Error(`Invalid crs paramater value '${crs}'`);
    }
    return _convert(this, crs);
};

export const C = {

    /**
     * Return a Coordinates object from a position object. The object just
     * needs to have x, y, z properties.
     *
     * @param {string} crs - The crs of the original position
     * @param {Object} position - the position to transform
     * @param {number} position.x - the x component of the position
     * @param {number} position.y - the y component of the position
     * @param {number} position.z - the z component of the position
     */
    EPSG_4326: function EPSG_4326(...args) {
        return new Coordinates('EPSG:4326', ...args);
    },
    EPSG_4326_Radians: function EPSG_4326(...args) {
        const result = new Coordinates('EPSG:4326', ...args);
        result._internalStorageUnit = UNIT.RADIAN;
        return result;
    },
};

export default Coordinates;
