/**
 * Generated On: 2015-10-5
 * Class: Coordinates
 * Description: Coordonnées cartographiques
 */

import * as THREE from 'three';
import proj4 from 'proj4';
import mE from '../Math/MathExtended';
import Ellipsoid from '../Math/Ellipsoid';

proj4.defs('EPSG:4978', '+proj=geocent +datum=WGS84 +units=m +no_defs');

const projectionCache = {};

export function ellipsoidSizes() {
    return {
        x: 6378137,
        y: 6378137,
        z: 6356752.3142451793,
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

export function reasonnableEpsilonForUnit(unit) {
    switch (unit) {
        case UNIT.RADIAN: return 0.00001;
        case UNIT.DEGREE: return 0.01;
        case UNIT.METER: return 0.001;
        default:
            return 0;
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

function instanceProj4(crsIn, crsOut) {
    if (projectionCache[crsIn]) {
        const p = projectionCache[crsIn];
        if (p[crsOut]) {
            return p[crsOut];
        }
    } else {
        projectionCache[crsIn] = {};
    }
    const p = proj4(crsIn, crsOut);
    projectionCache[crsIn][crsOut] = p;
    return p;
}

// Only support explicit conversions
function _convert(coordsIn, newCrs, target) {
    target = target || new Coordinates(newCrs, 0, 0);
    if (newCrs === coordsIn.crs) {
        const refUnit = crsToUnit(newCrs);
        if (coordsIn._internalStorageUnit != refUnit) {
            // custom internal unit
            if (coordsIn._internalStorageUnit == UNIT.DEGREE && refUnit == UNIT.RADIAN) {
                return target.set(
                    newCrs,
                    mE.degToRad(coordsIn._values[0]),
                    mE.degToRad(coordsIn._values[1]),
                    coordsIn._values[2]);
            } else if (coordsIn._internalStorageUnit == UNIT.RADIAN && refUnit == UNIT.DEGREE) {
                return target.set(
                    newCrs,
                    mE.radToDeg(coordsIn._values[0]),
                    mE.radToDeg(coordsIn._values[1]),
                    coordsIn._values[2]);
            }
        } else {
            return target.copy(coordsIn);
        }
    } else {
        if (coordsIn.crs === 'EPSG:4326' && newCrs === 'EPSG:4978') {
            const cartesian = ellipsoid.cartographicToCartesian(coordsIn);
            return target.set(newCrs, cartesian);
        }

        if (coordsIn.crs === 'EPSG:4978' && newCrs === 'EPSG:4326') {
            const geo = ellipsoid.cartesianToCartographic({
                x: coordsIn._values[0],
                y: coordsIn._values[1],
                z: coordsIn._values[2],
            });
            return target.set(newCrs, geo.longitude, geo.latitude, geo.h);
        }

        if (coordsIn.crs in proj4.defs && newCrs in proj4.defs) {
            // little hack due to our choice to use Radian for the EPSG:4326 projection (instead of the standard EPSG:4326 in Degree)
            const needToHack = coordsIn.crs === 'EPSG:4326' && coordsIn._internalStorageUnit == UNIT.RADIAN;
            const val0 = needToHack ? mE.radToDeg(coordsIn._values[0]) : coordsIn._values[0];
            const val1 = needToHack ? mE.radToDeg(coordsIn._values[1]) : coordsIn._values[1];

            // there is a bug for converting anything to 4978 with proj4
            if (newCrs == 'EPSG:4978') {
                // the workaround is to use an intermediate projection, like EPSG:4326
                const p = instanceProj4(coordsIn.crs, 'EPSG:4326').forward([val0, val1]);
                target.set('EPSG:4326', p[0], p[1], coordsIn._values[2]);
                return target.as('EPSG:4978');
            } else {
                // here is the normal case with proj4
                const p = instanceProj4(coordsIn.crs, newCrs).forward([val0, val1]);
                return target.set(newCrs, p[0], p[1], coordsIn._values[2]);
            }
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
 * Build a Coordinates object, given a {@link http://inspire.ec.europa.eu/theme/rs|crs} and a number of coordinates value. Coordinates can be in geocentric system, geographic system or an instance of {@link https://threejs.org/docs/#api/math/Vector3|THREE.Vector3}.
 * If crs = 'EPSG:4326', coordinates must be in geographic system.
 * If crs = 'EPSG:4978', coordinates must be in geocentric system.
 * @constructor
 * @param       {string} crs - Geographic or Geocentric coordinates system.
 * @param       {number|THREE.Vector3} coordinates - The globe coordinates to aim to.
 * @param       {number} coordinates.longitude - Geographic Coordinate longitude
 * @param       {number} coordinates.latitude - Geographic Coordinate latitude
 * @param       {number} coordinates.altitude - Geographic Coordinate altiude
 * @param       {number} coordinates.x - Geocentric Coordinate X
 * @param       {number} coordinates.y - Geocentric Coordinate Y
 * @param       {number} coordinates.z - Geocentric Coordinate Z
 * @example
 * new Coordinates('EPSG:4978', 20885167, 849862, 23385912); //Geocentric coordinates
 * // or
 * new Coordinates('EPSG:4326', 2.33, 48.24, 24999549); //Geographic coordinates
 */

function Coordinates(crs, ...coordinates) {
    this._values = new Float64Array(3);
    this.set(crs, ...coordinates);
}

Coordinates.prototype.set = function set(crs, ...coordinates) {
    _crsToUnitWithError(crs);
    this.crs = crs;

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
    return this;
};

Coordinates.prototype.clone = function clone(target) {
    let r;
    if (target) {
        Coordinates.call(target, this.crs, ...this._values);
        r = target;
    } else {
        r = new Coordinates(this.crs, ...this._values);
    }
    r._internalStorageUnit = this._internalStorageUnit;
    return r;
};

Coordinates.prototype.copy = function copy(src) {
    this.set(src.crs, ...src._values);
    this._internalStorageUnit = src._internalStorageUnit;
    return this;
};

/**
 * Returns the longitude in geographic coordinates. Coordinates must be in geographic system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coordinates = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * coordinates.longitude(); // Longitude in geographic system
 * // returns 2.33
 *
 * // or
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coords = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * const coordinates = coords.as('EPSG:4326');  // Geographic system
 * coordinates.longitude(); // Longitude in geographic system
 * // returns 2.330201911389028
 *
 * @param      {number} [unit] - 0: Radians, 1: Degrees.
 * @return     {number} - The longitude of the position.
 */

Coordinates.prototype.longitude = function longitude(unit) {
    _assertIsGeographic(this.crs);
    return convertValueToUnit(this._internalStorageUnit, unit, this._values[0]);
};

/**
 * Returns the latitude in geographic coordinates. Coordinates must be in geographic system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coordinates = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * coordinates.latitude(); // Latitude in geographic system
 * // returns : 48.24
 *
 * // or
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coords = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * const coordinates = coords.as('EPSG:4326');  // Geographic system
 * coordinates.latitude(); // Latitude in geographic system
 * // returns : 48.24830764643365
 *
 * @param      {number} [unit] - 0: Radians, 1: Degrees.
 * @return     {number} - The latitude of the position.
 */

Coordinates.prototype.latitude = function latitude(unit) {
    _assertIsGeographic(this.crs);
    return convertValueToUnit(this._internalStorageUnit, unit, this._values[1]);
};

/**
 * Returns the altitude in geographic coordinates. Coordinates must be in geographic system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coordinates = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * coordinates.altitude(); // Altitude in geographic system
 * // returns : 24999549
 *
 * // or
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coords = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * const coordinates = coords.as('EPSG:4326');  // Geographic system
 * coordinates.altitude(); // Altitude in geographic system
 * // returns : 24999548.046711832
 *
 * @return     {number} - The altitude of the position.
 */

Coordinates.prototype.altitude = function altitude() {
    _assertIsGeographic(this.crs);
    return this._values[2];
};

/**
 * Set the altiude.
 * @example coordinates.setAltitude(number)
 * @param      {number} - Set the altitude.
 */

Coordinates.prototype.setAltitude = function setAltitude(altitude) {
    _assertIsGeographic(this.crs);
    this._values[2] = altitude;
};

 /**
 * Returns the longitude in geocentric coordinates. Coordinates must be in geocentric system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coordinates = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * coordinates.x();  // Geocentric system
 * // returns : 20885167
 *
 * // or
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coords = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * const coordinates = coords.as('EPSG:4978'); // Geocentric system
 * coordinates.x(); // Geocentric system
 * // returns : 20888561.0301258
 *
 * @return     {number} - The longitude of the position.
 */

Coordinates.prototype.x = function x() {
    _assertIsGeocentric(this.crs);
    return this._values[0];
};

/**
 * Returns the latitude in geocentric coordinates. Coordinates must be in geocentric system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coordinates = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * coordinates.y();  // Geocentric system
 * // returns : 849862
 *
 * // or
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coords = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * const coordinates = coords.as('EPSG:4978'); // Geocentric system
 * coordinates.y(); // Geocentric system
 * // returns : 849926.376770819
 *
 * @return     {number} - The latitude of the position.
 */

Coordinates.prototype.y = function y() {
    _assertIsGeocentric(this.crs);
    return this._values[1];
};

/**
 * Returns the altitude in geocentric coordinates. Coordinates must be in geocentric system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coordinates = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * coordinates.z();  // Geocentric system
 * // returns : 23385912
 *
 * // or
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coords = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * const coordinates = coords.as('EPSG:4978'); // Geocentric system
 * coordinates.z(); // Geocentric system
 * // returns : 23382883.536591515
 *
 * @return     {number} - The altitude of the position.
 */

Coordinates.prototype.z = function z() {
    _assertIsGeocentric(this.crs);
    return this._values[2];
};

/**
 * Returns a position in cartesian coordinates. Coordinates must be in geocentric system (can be converted by using {@linkcode as()} ).
 * @example
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coordinates = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * coordinates.xyz();  // Geocentric system
 * // returns : Vector3
 * // x: 20885167
 * // y: 849862
 * // z: 23385912
 *
 * // or
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coords = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * const coordinates = coords.as('EPSG:4978'); // Geocentric system
 * coordinates.xyz(); // Geocentric system
 * // returns : Vector3
 * // x: 20885167
 * // y: 849862
 * // z: 23385912
 *
 * @return     {Position} - position
 */

Coordinates.prototype.xyz = function xyz(target) {
    _assertIsGeocentric(this.crs);
    const v = target || new THREE.Vector3();
    v.fromArray(this._values);
    return v;
};

/**
 * Returns coordinates in the wanted {@link http://inspire.ec.europa.eu/theme/rs|CRS}.
 * @example
 *
 * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
 * const coords = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
 * const coordinates = coords.as('EPSG:4978'); // Geocentric system
 *
 * // or
 *
 * const position = { x: 20885167, y: 849862, z: 23385912 };
 * const coords = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
 * const coordinates = coords.as('EPSG:4326');  // Geographic system
 *
 * //or
 *
 * new Coordinates('EPSG:4326', longitude: 2.33, latitude: 48.24, altitude: 24999549).as('EPSG:4978'); // Geocentric system
 *
 * // or
 *
 * new Coordinates('EPSG:4978', x: 20885167, y: 849862, z: 23385912).as('EPSG:4326'); // Geographic system
 *
 * @param      {string} - {@link http://inspire.ec.europa.eu/theme/rs|crs} : Geocentric (ex: 'EPSG:4326') or Geographic (ex: 'EPSG:4978').
 * @return     {Position} - position
 */

Coordinates.prototype.as = function as(crs, target) {
    if (crs === undefined || !crsToUnit(crs)) {
        throw new Error(`Invalid crs paramater value '${crs}'`);
    }
    return _convert(this, crs, target);
};

/**
 * Returns the normalized offset from top-left in extent of this Coordinates
 * e.g: extent.center().offsetInExtent(extent) would return (0.5, 0.5).
 * @param {Extent} extent
 * @param {Vector2} target optional Vector2 target. If not present a new one will be created
 * @return {Vector2} normalized offset in extent
 */
Coordinates.prototype.offsetInExtent = function offsetInExtent(extent, target) {
    if (this.crs != extent.crs()) {
        throw new Error('unsupported mix');
    }

    const dimension = {
        x: Math.abs(extent.east() - extent.west()),
        y: Math.abs(extent.north() - extent.south()),
    };

    const x = extent._internalStorageUnit == UNIT.METER ? this.x() : this.longitude(extent._internalStorageUnit);
    const y = extent._internalStorageUnit == UNIT.METER ? this.y() : this.latitude(extent._internalStorageUnit);

    const originX = (x - extent.west()) / dimension.x;
    const originY = (extent.north() - y) / dimension.y;

    target = target || new THREE.Vector2();
    target.set(originX, originY);
    return target;
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
     * @return {Coordinates}
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
