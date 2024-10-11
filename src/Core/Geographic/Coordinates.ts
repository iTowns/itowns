import * as THREE from 'three';
import proj4 from 'proj4';
import * as CRS from 'Core/Geographic/Crs';
import Ellipsoid from 'Core/Math/Ellipsoid';

import type { ProjectionLike } from './Crs';

const ellipsoid = new Ellipsoid();
const projectionCache: Record<string, Record<string, proj4.Converter>> = {};

const v0 = new THREE.Vector3();
const v1 = new THREE.Vector3();

let coord0: Coordinates;
let coord1: Coordinates;

export interface CoordinatesLike {
    readonly crs: string;
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

function proj4cache(crsIn: string, crsOut: string): proj4.Converter {
    if (!projectionCache[crsIn]) {
        projectionCache[crsIn] = {};
    }

    if (!projectionCache[crsIn][crsOut]) {
        projectionCache[crsIn][crsOut] = proj4(crsIn, crsOut);
    }

    return projectionCache[crsIn][crsOut];
}

/**
 * A Coordinates object, defined by a [crs](http://inspire.ec.europa.eu/theme/rs)
 * and three values. These values are accessible through `x`, `y` and `z`,
 * although it can also be accessible through `latitude`, `longitude` and
 * `altitude`. To change a value, prefer the `set()` method below.
 *
 * `EPSG:4978` and `EPSG:4326` are supported by default. To use another CRS,
 * you have to declare it with `proj4`. You can find most projections and their
 * proj4 code at [epsg.io](https://epsg.io/).
 *
 * @example
 * new Coordinates('EPSG:4978', 20885167, 849862, 23385912); //Geocentric coordinates
 * new Coordinates('EPSG:4326', 2.33, 48.24, 24999549); //Geographic coordinates
 *
 * @example
 * // Declare EPSG:3946 with proj4
 * itowns.proj4.defs('EPSG:3946', '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
 */
class Coordinates {
    /**
     * Used to checkout whether this coordinates is a Coordinates. Default is
     * true. You should not change this, as it is used internally for
     * optimisation.
     */
    readonly isCoordinates: boolean;
    /**
     * A supported crs by default in
     * [`proj4js`](https://github.com/proj4js/proj4js#named-projections), or an
     * added crs to `proj4js` (using `proj4.defs`). Note that `EPSG:4978` is
     * also supported by default in itowns.
     */
    crs: ProjectionLike;

    /** The first value of the coordinate. */
    x: number;
    /** The second value of the coordinate. */
    y: number;
    /** The third value of the coordinate. */
    z: number;

    private _normal: THREE.Vector3;
    private _normalNeedsUpdate: boolean;

    /**
     * @param crs - A supported Coordinate Reference System.
     * @param x - x or longitude value.
     * @param y - y or latitude value.
     * @param z - z or altitude value.
     */
    constructor(crs: ProjectionLike, x: number = 0, y: number = 0, z: number = 0) {
        this.isCoordinates = true;

        CRS.isValid(crs);
        this.crs = crs;

        // Storing the coordinates as is, not in arrays, as it is
        // slower (see https://jsbench.me/40jumfag6g/1)
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Normal
        this._normal = new THREE.Vector3();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((x as any).length > 0) { // deepscan-disable-line
            console.warn(
                'Deprecated Coordinates#constructor(string, number[]),',
                'use `new Coordinates(string).setFromArray(number[])` instead.',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setFromArray(x as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((x as any).isVector3 || (x as any).isCoordinates) {
            console.warn(
                'Deprecated Coordinates#constructor(string, Vector3),',
                'use `new Coordinates(string).setFromVector3(Vector3)` instead.',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setFromVector3(x as any);
        } else {
            this.setFromValues(x, y, z);
        }

        this._normalNeedsUpdate = true;
    }

    /**
     * Sets the Coordinate Reference System.
     * @param crs - Coordinate Reference System (e.g. 'EPSG:4978')
     */
    setCrs(crs: ProjectionLike): this {
        CRS.isValid(crs);
        this.crs = crs;
        return this;
    }

    /**
     * Set the values of this Coordinates.
     *
     * @param x - x or longitude value.
     * @param y - y or latitude value.
     * @param z - z or altitude value.
     *
     * @returns This Coordinates.
     */
    setFromValues(x: number = 0, y: number = 0, z: number = 0): this {
        this.x = x;
        this.y = y;
        this.z = z;

        this._normalNeedsUpdate = true;
        return this;
    }

    /**
     * Set the values of this Coordinates from an array.
     *
     * @param array - An array of number to assign to the Coordinates.
     * @param offset - Optional offset into the array.
     *
     * @returns This Coordinates.
     */
    setFromArray(array: number[], offset: number = 0): this {
        return this.setFromValues(
            array[offset],
            array[offset + 1],
            array[offset + 2],
        );
    }

    /**
     * Set the values of this Coordinates from a `THREE.Vector3` or an `Object`
     * having `x/y/z` properties, like a `Coordinates`.
     *
     * @param v - The object to read the values from.
     *
     * @returns This Coordinates.
     */
    setFromVector3(v: THREE.Vector3Like): this {
        return this.setFromValues(v.x, v.y, v.z);
    }

    /**
     * Returns a new Coordinates with the same values as this one. It will
     * instantiate a new Coordinates with the same CRS as this one.
     *
     * @returns The target with its new coordinates.
     */
    clone(): Coordinates {
        return new Coordinates(this.crs, this.x, this.y, this.z);
    }

    /**
     * Copies the values of the passed Coordinates to this one. The CRS is
     * however not copied.
     *
     * @param src - The source to copy from.
     *
     * @returns This Coordinates.
     */
    copy(src: CoordinatesLike): this {
        this.crs = src.crs;
        return this.setFromVector3(src);
    }

    get longitude() {
        return this.x;
    }

    get latitude() {
        return this.y;
    }

    get altitude() {
        return this.z;
    }

    set altitude(value) {
        this.z = value;
    }

    /**
     * The geodesic normal of the coordinate.
     */
    get geodesicNormal() {
        if (this._normalNeedsUpdate) {
            this._normalNeedsUpdate = false;

            if (CRS.is4326(this.crs)) {
                ellipsoid.geodeticSurfaceNormalCartographic(this, this._normal);
            } else if (this.crs == 'EPSG:4978') {
                ellipsoid.geodeticSurfaceNormal(this, this._normal);
            } else {
                this._normal.set(0, 0, 1);
            }
        }

        return this._normal;
    }

    /**
     * Return this Coordinates values into a `THREE.Vector3`.
     *
     * @param target - The target to put the values in. If not specified, a new
     * vector will be created.
     */
    toVector3(target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
        return target.copy(this);
    }

    /**
     * Copy values coordinates to array
     *
     * @param array - array to store this vector to. If this is not
     * provided a new array will be created.
     * @param offset - optional offset into the array.
     *
     * @returns An array [x, y, z], or copies x, y and z into the provided
     * array.
     */
    toArray(array: number[] = [], offset: number = 0): ArrayLike<number> {
        return THREE.Vector3.prototype.toArray.call(this, array, offset);
    }

    /**
     * Calculate planar distance between this coordinates and `coord`.
     * Planar distance is the straight-line euclidean distance calculated in a
     * 2D cartesian coordinate system.
     *
     * @param coord - The coordinate
     * @returns planar distance
     */
    planarDistanceTo(coord: Coordinates): number {
        this.toVector3(v0).setZ(0);
        coord.toVector3(v1).setZ(0);
        return v0.distanceTo(v1);
    }

    /**
     * Calculate geodetic distance between this coordinates and `coord`.
     * **Geodetic distance** is calculated in an ellispoid space as the shortest
     * distance across the curved surface of the world.
     *
     * @param coord - The coordinate
     * @returns geodetic distance
     */
    geodeticDistanceTo(coord: Coordinates): number {
        this.as('EPSG:4326', coord0);
        coord.as('EPSG:4326', coord1);
        return ellipsoid.geodesicDistance(coord0, coord1);
    }

    /**
     * Calculate earth euclidean distance between this coordinates and `coord`.
     *
     * @param coord - The coordinate
     * @returns earth euclidean distance
     */
    spatialEuclideanDistanceTo(coord: Coordinates): number {
        this.as('EPSG:4978', coord0).toVector3(v0);
        coord.as('EPSG:4978', coord1).toVector3(v1);
        return v0.distanceTo(v1);
    }

    /**
     * Multiplies this `coordinates` (with an implicit 1 in the 4th dimension)
     * and `mat`.
     *
     * @param mat - The matrix.
     * @returns return this object.
     */
    applyMatrix4(mat: THREE.Matrix4): this {
        THREE.Vector3.prototype.applyMatrix4.call(this, mat);
        return this;
    }

    /**
     * Returns coordinates in the wanted
     * [CRS](http://inspire.ec.europa.eu/theme/rs).
     *
     * @param crs - The CRS to convert the Coordinates into.
     * @param target - The target to put the converted
     * Coordinates into. If not specified a new one will be created.
     *
     * @returns The resulting Coordinates after the conversion.
     *
     * @example
     * const position = { longitude: 2.33, latitude: 48.24, altitude: 24999549 };
     * const coords = new Coordinates('EPSG:4326', position.longitude, position.latitude, position.altitude); // Geographic system
     * const coordinates = coords.as('EPSG:4978'); // Geocentric system
     *
     * @example
     * const position = { x: 20885167, y: 849862, z: 23385912 };
     * const coords = new Coordinates('EPSG:4978', position.x, position.y, position.z);  // Geocentric system
     * const coordinates = coords.as('EPSG:4326');  // Geographic system
     *
     * @example
     * new Coordinates('EPSG:4326', longitude: 2.33, latitude: 48.24, altitude: 24999549).as('EPSG:4978'); // Geocentric system
     *
     * @example
     * new Coordinates('EPSG:4978', x: 20885167, y: 849862, z: 23385912).as('EPSG:4326'); // Geographic system
     */
    as(crs: ProjectionLike, target = new Coordinates(crs)): Coordinates {
        if (this.crs == crs) {
            target.copy(this);
        } else {
            if (CRS.is4326(this.crs) && crs == 'EPSG:3857') {
                this.y = THREE.MathUtils.clamp(this.y, -89.999999, 89.999999);
            }

            target.setFromArray(proj4cache(this.crs, crs)
                .forward([this.x, this.y, this.z]));
        }

        target.crs = crs;

        return target;
    }
}

coord0 = new Coordinates('EPSG:4326', 0, 0, 0);
coord1 = new Coordinates('EPSG:4326', 0, 0, 0);

export default Coordinates;
