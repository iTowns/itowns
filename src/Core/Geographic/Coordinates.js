/**
 * Generated On: 2015-10-5
 * Class: Coordinates
 * Description: Coordonnées cartographiques
 */

import * as THREE from 'three';
import proj4 from 'proj4';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CRS from 'Core/Geographic/Crs';

const projectionCache = {};
const dimension = new THREE.Vector2();

const ellipsoid = new Ellipsoid();

function _assertIsGeographic(crs) {
    if (!CRS.isGeographic(crs)) {
        throw new Error(`Can't query crs ${crs} long/lat`);
    }
}

function _assertIsMetric(crs) {
    if (!CRS.isMetricUnit(crs)) {
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
const cartesian = new THREE.Vector3();
function _convert(coordsIn, newCrs, target) {
    target = target || new Coordinates(newCrs, 0, 0);
    if (newCrs === coordsIn.crs) {
        return target.copy(coordsIn);
    } else {
        if (CRS.is4326(coordsIn.crs) && newCrs === 'EPSG:4978') {
            ellipsoid.cartographicToCartesian(coordsIn, cartesian);
            target.set(newCrs, cartesian);
            target._normal = coordsIn._normal;
            target._normalNeedsUpdate = false;
            return target;
        }

        if (coordsIn.crs === 'EPSG:4978' && CRS.is4326(newCrs)) {
            ellipsoid.cartesianToCartographic({
                x: coordsIn._values[0],
                y: coordsIn._values[1],
                z: coordsIn._values[2],
            }, target);
            return target;
        }

        if (coordsIn.crs in proj4.defs && newCrs in proj4.defs) {
            const val0 = coordsIn._values[0];
            let val1 = coordsIn._values[1];
            const crsIn = coordsIn.crs;

            // there is a bug for converting anything from and to 4978 with proj4
            // https://github.com/proj4js/proj4js/issues/195
            // the workaround is to use an intermediate projection, like EPSG:4326
            if (newCrs == 'EPSG:4978') {
                const p = instanceProj4(crsIn, 'EPSG:4326').forward([val0, val1]);
                target.set('EPSG:4326', p[0], p[1], coordsIn._values[2]);
                return target.as('EPSG:4978', target);
            } else if (coordsIn.crs === 'EPSG:4978') {
                coordsIn.as('EPSG:4326', target);
                const p = instanceProj4(target.crs, newCrs).forward([target._values[0], target._values[1]]);
                target.set(newCrs, p[0], p[1], target._values[2]);
                return target;
            } else if (CRS.is4326(crsIn) && newCrs == 'EPSG:3857') {
                val1 = THREE.Math.clamp(val1, -89.999999, 89.999999);
                const p = instanceProj4(crsIn, newCrs).forward([val0, val1]);
                return target.set(newCrs, p[0], p[1], coordsIn._values[2]);
            } else {
                // here is the normal case with proj4
                const p = instanceProj4(crsIn, newCrs).forward([val0, val1]);
                return target.set(newCrs, p[0], p[1], coordsIn._values[2]);
            }
        }

        throw new Error(`Cannot convert from crs ${coordsIn.crs} to ${newCrs}`);
    }
}

/**
 * Build a Coordinates object, given a [crs]{@link
 * http://inspire.ec.europa.eu/theme/rs} and a number of coordinates value.
 * Coordinates can be in geocentric system, geographic system or an instance of
 * [THREE.Vector3]{@link https://threejs.org/docs/#api/math/Vector3}.
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
    this._normalNeedsUpdate = true;
    this._normal = new THREE.Vector3();

    // this._normal = this._normal || computeGeodesicNormal(this);
    Object.defineProperty(this, 'geodesicNormal',
        {
            configurable: true,
            get: () => (this._normalNeedsUpdate ? computeGeodesicNormal(this) : this._normal),
        });
}

const planarNormal = new THREE.Vector3(0, 0, 1);

function computeGeodesicNormal(coord) {
    coord._normalNeedsUpdate = false;
    if (CRS.is4326(coord.crs)) {
        return ellipsoid.geodeticSurfaceNormalCartographic(coord, coord._normal);
    }
    // In globe mode (EPSG:4978), we compute the normal.
    if (coord.crs == 'EPSG:4978') {
        return ellipsoid.geodeticSurfaceNormal(coord, coord._normal);
    }
    coord._normal.copy(planarNormal);
    // In planar mode, normal is the up vector.
    return planarNormal;
}

Coordinates.prototype.set = function set(crs, ...coordinates) {
    CRS.isValid(crs);
    this.crs = crs;

    if (coordinates.length == 1 && coordinates[0].isVector3) {
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
    this._normalNeedsUpdate = true;
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
    if (this._normal) {
        r._normal.copy(this._normal);
    }
    return r;
};

Coordinates.prototype.copy = function copy(src) {
    this.set(src.crs, ...src._values);
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
 * @return     {number} - The longitude of the position.
 */

Coordinates.prototype.longitude = function longitude() {
    _assertIsGeographic(this.crs);
    return this._values[0];
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
 * @return     {number} - The latitude of the position.
 */

Coordinates.prototype.latitude = function latitude() {
    return this._values[1];
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
    _assertIsMetric(this.crs);
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
    _assertIsMetric(this.crs);
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
    _assertIsMetric(this.crs);
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
    _assertIsMetric(this.crs);
    const v = target || new THREE.Vector3();
    v.fromArray(this._values);
    return v;
};

/**
 * Returns coordinates in the wanted [CRS]{@link http://inspire.ec.europa.eu/theme/rs}.
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
 * @param      {string} - [crs]{@link http://inspire.ec.europa.eu/theme/rs} : Geocentric (ex: 'EPSG:4326') or Geographic (ex: 'EPSG:4978').
 * @return     {Position} - position
 */

Coordinates.prototype.as = function as(crs, target) {
    if (crs === undefined || CRS.toUnit(crs) === undefined) {
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
    if (this.crs != extent.crs) {
        throw new Error('unsupported mix');
    }

    extent.dimensions(dimension);

    const x = CRS.isGeographic(this.crs) ? this.longitude() : this.x();
    const y = CRS.isGeographic(this.crs) ? this.latitude() : this.y();

    const originX = (x - extent.west) / dimension.x;
    const originY = (extent.north - y) / dimension.y;

    target = target || new THREE.Vector2();
    target.set(originX, originY);
    return target;
};

export default Coordinates;
