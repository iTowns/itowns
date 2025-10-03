import { Vector2, Vector3, Vector4, Box3, type Matrix4 } from 'three';
import Coordinates from './Coordinates';
import * as CRS from './Crs';

import type { ProjectionAlias } from './Crs';

const _dim = new Vector2();
const _dim2 = new Vector2();
const _box = new Box3();
const defaultScheme = new Vector2(2, 2);

const cNorthWest =  new Coordinates('EPSG:4326', 0, 0, 0);
const cSouthWest =  new Coordinates('EPSG:4326', 0, 0, 0);
const cNorthEast =  new Coordinates('EPSG:4326', 0, 0, 0);

const southWest = new Vector3();
const northEast = new Vector3();

let _extent: Extent;

const cardinals = new Array(8);
for (let i = cardinals.length - 1; i >= 0; i--) {
    cardinals[i] = new Coordinates('EPSG:4326', 0, 0, 0);
}

const _c = new Coordinates('EPSG:4326', 0, 0);

export interface ExtentLike {
    readonly west: number;
    readonly east: number;
    readonly south: number;
    readonly north: number;
}

/**
 * A class representing a geographical extent.
 *
 * An extent is a geographical bounding rectangle defined by 4 limits: west,
 * east, south and north.
 *
 * **Warning**: Using a geocentric projection is not suitable for representing a
 * geographical extent. Please use a geographic projection.
 */
class Extent {
    /**
     * Read-only flag to check if a given object is of type `Extent`.
     */
    readonly isExtent: true;
    /**
     * A default or user-defined CRS (see {@link ProjectionAlias}).
     */
    crs: ProjectionAlias;
    /**
     * West longitude bound of this extent.
     */
    west: number;
    /**
     * East longitude bound of this extent.
     */
    east: number;
    /**
     * South latitude bound of this extent.
     */
    south: number;
    /**
     * North latitude bound of this extent.
     */
    north: number;

    /**
     * @param crs - A default or user-defined CRS (see {@link ProjectionAlias}).
     * @param west - the `west` value of this extent. Default is 0.
     * @param east - the `east` value of this extent. Default is 0.
     * @param south - the `south` value of this extent. Default is 0.
     * @param north - the `north` value of this extent. Default is 0.
     */
    constructor(crs: ProjectionAlias, west = 0, east = 0, south = 0, north = 0) {
        if (CRS.isGeocentric(crs)) {
            throw new Error(
                `Non-compatible geocentric projection ${crs} to build a geographical extent`,
            );
        }

        this.isExtent = true;
        this.crs = crs;

        this.west = 0;
        this.east = 0;
        this.south = 0;
        this.north = 0;

        this.set(west, east, south, north);
    }

    /**
     * Returns a new extent with the same bounds and crs as this one.
     */
    clone() {
        return new Extent(this.crs, this.west, this.east, this.south, this.north);
    }

    /**
     * Projects this extent to the specified projection.
     *
     * @param crs - target's projection.
     * @param target - The target to store the projected extent. If this not
     * provided a new extent will be created.
     */
    as(crs: string, target: Extent = new Extent('EPSG:4326')) {
        CRS.isValid(crs);
        if (this.crs != crs) {
            // Compute min/max in x/y by projecting 8 cardinal points,
            // and then taking the min/max of each coordinates.
            const center = this.center(_c);
            cardinals[0].setFromValues(this.west, this.north);
            cardinals[1].setFromValues(center.x, this.north);
            cardinals[2].setFromValues(this.east, this.north);
            cardinals[3].setFromValues(this.east, center.y);
            cardinals[4].setFromValues(this.east, this.south);
            cardinals[5].setFromValues(center.x, this.south);
            cardinals[6].setFromValues(this.west, this.south);
            cardinals[7].setFromValues(this.west, center.y);

            target.set(Infinity, -Infinity, Infinity, -Infinity);

            // loop over the coordinates
            for (let i = 0; i < cardinals.length; i++) {
                // convert the coordinate.
                cardinals[i].crs = this.crs;
                cardinals[i].as(crs, _c);
                target.north = Math.max(target.north, _c.y);
                target.south = Math.min(target.south, _c.y);
                target.east = Math.max(target.east, _c.x);
                target.west = Math.min(target.west, _c.x);
            }

            target.crs = crs;
            return target;
        }

        target.crs = crs;
        target.set(this.west, this.east, this.south, this.north);

        return target;
    }

    /**
     * Returns the center of the extent.
     *
     * @param target - The target to store the center coordinate. If this not
     * provided a new coordinate will be created.
     */
    center(target = new Coordinates(this.crs)) {
        this.planarDimensions(_dim);

        target.crs = this.crs;
        target.setFromValues(this.west + _dim.x * 0.5, this.south + _dim.y * 0.5);

        return target;
    }

    /**
     * Returns the planar dimensions as two-vector planar distances west/east
     * and south/north.
     * The planar distance is a straight-line Euclidean distance calculated in a
     * 2D Cartesian coordinate system.
     *
     * @param target - optional target
     */
    planarDimensions(target = new Vector2()) {
        // Calculte the dimensions for x and y
        return target.set(Math.abs(this.east - this.west), Math.abs(this.north - this.south));
    }

    /**
     * Returns the geodetic dimensions as two-vector planar distances west/east
     * and south/north.
     * Geodetic distance is calculated in an ellispoid space as the distance
     * across the curved surface of the ellipsoid.
     *
     * @param target - optional target
     */
    geodeticDimensions(target = new Vector2()) {
        // set 3 corners extent
        cNorthWest.crs = this.crs;
        cSouthWest.crs = this.crs;
        cNorthEast.crs = this.crs;

        cNorthWest.setFromValues(this.west, this.north, 0);
        cSouthWest.setFromValues(this.west, this.south, 0);
        cNorthEast.setFromValues(this.east, this.north, 0);

        // calcul geodetic distance northWest/northEast and northWest/southWest
        return target.set(
            cNorthWest.geodeticDistanceTo(cNorthEast),
            cNorthWest.geodeticDistanceTo(cSouthWest),
        );
    }

    /**
     *  Returns the spatial euclidean dimensions as a two-vector spatial
     *  euclidean distances between west/east corner and south/north corner.
     *  Spatial euclidean distance chord is calculated in an ellispoid space.
     *
     * @param target - optional target
     */
    spatialEuclideanDimensions(target = new Vector2()) {
        // set 3 corners extent
        cNorthWest.crs = this.crs;
        cSouthWest.crs = this.crs;
        cNorthEast.crs = this.crs;

        cNorthWest.setFromValues(this.west, this.north, 0);
        cSouthWest.setFromValues(this.west, this.south, 0);
        cNorthEast.setFromValues(this.east, this.north, 0);

        // calcul chord distance northWest/northEast and northWest/southWest
        return target.set(
            cNorthWest.spatialEuclideanDistanceTo(cNorthEast),
            cNorthWest.spatialEuclideanDistanceTo(cSouthWest),
        );
    }

    /**
     * Checks whether a coordinates is inside the extent.
     *
     * @param coord - the given coordinates.
     * @param epsilon - error margin when comparing to the coordinates.
     * Default is 0.
     */
    isPointInside(coord: Coordinates, epsilon = 0) {
        if (this.crs == coord.crs) {
            _c.copy(coord);
        } else {
            coord.as(this.crs, _c);
        }

        // TODO this ignores altitude
        return _c.x <= this.east + epsilon &&
               _c.x >= this.west - epsilon &&
               _c.y <= this.north + epsilon &&
               _c.y >= this.south - epsilon;
    }

    /**
     * Checks whether another extent is inside the extent.
     *
     * @param extent - the extent to check
     * @param epsilon - error margin when comparing the extent bounds.
     */
    isInside(extent: Extent, epsilon = CRS.reasonableEpsilon(this.crs)) {
        extent.as(this.crs, _extent);
        return this.east - _extent.east <= epsilon &&
                _extent.west - this.west <= epsilon &&
                this.north - _extent.north <= epsilon &&
                _extent.south - this.south <= epsilon;
    }

    /**
     * Return the translation and scale to transform this extent to the input
     * extent.
     *
     * @param extent - input extent
     * @param target - copy the result to target.
     * @returns A {@link THREE.Vector4} where the `x` property encodes the
     * translation on west-east, the `y` property the translation on
     * south-north, the `z` property the scale on west-east, the `w` property
     * the scale on south-north.
     */
    offsetToParent(extent: Extent, target = new Vector4()) {
        if (this.crs != extent.crs) {
            throw new Error('unsupported mix');
        }

        extent.planarDimensions(_dim);
        this.planarDimensions(_dim2);

        const originX = (this.west - extent.west) / _dim.x;
        const originY = (extent.north - this.north) / _dim.y;

        const scaleX = _dim2.x / _dim.x;
        const scaleY = _dim2.y / _dim.y;

        return target.set(originX, originY, scaleX, scaleY);
    }

    /**
     * Checks wheter this bounding box intersects with the given extent
     * parameter.
     * @param extent - the provided extent
     */
    intersectsExtent(extent: Extent) {
        return Extent.intersectsExtent(this, extent);
    }

    static intersectsExtent(extentA: Extent, extentB: Extent) {
        // TODO don't work when is on limit
        const other = extentB.crs == extentA.crs ? extentB : extentB.as(extentA.crs, _extent);
        return !(extentA.west >= other.east ||
            extentA.east <= other.west ||
            extentA.south >= other.north ||
            extentA.north <= other.south);
    }

    /**
     * Returns the intersection of this extent with another one.
     * @param extent - extent to intersect
     */
    intersect(extent: Extent) {
        if (!this.intersectsExtent(extent)) {
            return new Extent(this.crs);
        }
        if (extent.crs != this.crs) {
            extent = extent.as(this.crs, _extent);
        }
        return new Extent(this.crs,
            Math.max(this.west, extent.west),
            Math.min(this.east, extent.east),
            Math.max(this.south, extent.south),
            Math.min(this.north, extent.north));
    }

    /**
     * Set west, east, south and north values.
     *
     * @param v0 - the `west` value of this extent. Default is 0.
     * @param v1 - the `east` value of this extent. Default is 0.
     * @param v2 - the `south` value of this extent. Default is 0.
     * @param v3 - the `north` value of this extent. Default is 0.
     */
    set(v0: number, v1: number, v2: number, v3: number): this {
        if (v0 == undefined) {
            throw new Error('No values to set in the extent');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((v0 as any).west !== undefined) {
            console.warn(
                'Deprecated Extent#constructor(string, Extent) and Extent#set(Extent),',
                'use new Extent(string).setFromExtent(Extent) instead.',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setFromExtent(v0 as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((v0 as any).length == 4) { // deepscan-disable-line
            console.warn(
                'Deprecated Extent#constructor(string, number[]) and Extent#set(number[]),',
                'use new Extent(string).setFromArray(number[]) instead.',
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setFromArray(v0 as any);
        } else if (v3 !== undefined) {
            this.west = v0;
            this.east = v1;
            this.south = v2;
            this.north = v3;
        }

        return this;
    }

    /**
     * Sets this extent `west` property to `array[offset + 0]`, `east` property
     * to `array[offset + 1]`, `south` property to `array[offset + 2]` and
     * `north` property to `array[offset + 3]`.
     * @param array - the source array
     * @param offset - offset into the array. Default is 0.
     */
    setFromArray(array: ArrayLike<number>, offset: number = 0): this {
        this.west = array[offset];
        this.east = array[offset + 1];
        this.south = array[offset + 2];
        this.north = array[offset + 3];
        return this;
    }

    /**
     * Sets this extent `west`, `east`, `south` and `north` properties from an
     * `extent` bounds.
     * @param extent - the source extent
     */
    setFromExtent(extent: ExtentLike): this {
        this.west = extent.west;
        this.east = extent.east;
        this.south = extent.south;
        this.north = extent.north;
        return this;
    }

    /**
     * Copies the passed extent to this extent.
     * @param extent - extent to copy.
     */
    copy(extent: Extent): this {
        this.crs = extent.crs;
        return this.setFromExtent(extent);
    }

    /**
     * Union this extent with the input extent.
     * @param extent - the extent to union.
     */
    union(extent: Extent) {
        if (extent.crs != this.crs) {
            throw new Error('unsupported union between 2 diff crs');
        }
        if (this.west === Infinity) {
            this.copy(extent);
        } else {
            const west = extent.west;
            if (west < this.west) {
                this.west = west;
            }

            const east = extent.east;
            if (east > this.east) {
                this.east = east;
            }

            const south = extent.south;
            if (south < this.south) {
                this.south = south;
            }

            const north = extent.north;
            if (north > this.north) {
                this.north = north;
            }
        }
    }

    /**
     * expandByCoordinates perfoms the minimal extension
     * for the coordinates to belong to this Extent object
     * @param coordinates - The coordinates to belong
     */
    expandByCoordinates(coordinates: Coordinates) {
        const coords = coordinates.crs == this.crs ? coordinates : coordinates.as(this.crs, _c);
        this.expandByValuesCoordinates(coords.x, coords.y);
    }

    /**
    * expandByValuesCoordinates perfoms the minimal extension
    * for the coordinates values to belong to this Extent object
    * @param we - The coordinate on west-east
    * @param sn - The coordinate on south-north
    *
    */
    expandByValuesCoordinates(we: number, sn: number) {
        if (we < this.west) {
            this.west = we;
        }
        if (we > this.east) {
            this.east = we;
        }
        if (sn < this.south) {
            this.south = sn;
        }
        if (sn > this.north) {
            this.north = sn;
        }
    }

    /**
     * Instance Extent with THREE.Box3.
     *
     * If crs is a geocentric projection, the `box3.min` and `box3.max`
     * should be the geocentric coordinates of `min` and `max` of a `box3`
     * in local tangent plane.
     *
     * @param crs - Projection of extent to instancied.
     * @param box - Bounding-box
     */
    static fromBox3(crs: ProjectionAlias, box: Box3) {
        if (CRS.isGeocentric(crs)) {
            // if geocentric reproject box on 'EPSG:4326'
            crs = 'EPSG:4326';
            box = _box.copy(box);

            cSouthWest.crs = crs;
            cSouthWest.setFromVector3(box.min).as(crs, cSouthWest).toVector3(box.min);
            cNorthEast.crs = crs;
            cNorthEast.setFromVector3(box.max).as(crs, cNorthEast).toVector3(box.max);
        }

        return new Extent(crs).setFromExtent({
            west: box.min.x,
            east: box.max.x,
            south: box.min.y,
            north: box.max.y,
        });
    }

    /**
     * Return values of extent in string, separated by the separator input.
     * @param sep - string separator
     */
    toString(sep = '') {
        return `${this.east}${sep}${this.north}${sep}${this.west}${sep}${this.south}`;
    }

    /**
     * Subdivide equally an extent from its center to return four extents:
     * north-west, north-east, south-west and south-east.
     *
     * @returns An array containing the four sections of the extent. The order
     * of the sections is [NW, NE, SW, SE].
     */
    subdivision() {
        return this.subdivisionByScheme();
    }

    /**
     * subdivise extent by scheme.x on west-east and scheme.y on south-north.
     *
     * @param scheme - The scheme to subdivise.
     * @returns subdivised extents.
     */
    subdivisionByScheme(scheme = defaultScheme): Extent[] {
        const subdivisedExtents = [];
        const dimSub = this.planarDimensions(_dim).divide(scheme);
        for (let x = scheme.x - 1; x >= 0; x--) {
            for (let y = scheme.y - 1; y >= 0; y--) {
                const west = this.west + x * dimSub.x;
                const south = this.south + y * dimSub.y;
                subdivisedExtents.push(new Extent(this.crs,
                    west,
                    west + dimSub.x,
                    south,
                    south + dimSub.y));
            }
        }
        return subdivisedExtents;
    }

    /**
     * Multiplies all extent `coordinates` (with an implicit 1 in the 4th
     * dimension) and `matrix`.
     *
     * @param matrix - The matrix
     * @returns return this extent instance.
     */
    applyMatrix4(matrix: Matrix4): this {
        southWest.set(this.west, this.south, 0).applyMatrix4(matrix);
        northEast.set(this.east, this.north, 0).applyMatrix4(matrix);
        this.west = southWest.x;
        this.east = northEast.x;
        this.south = southWest.y;
        this.north = northEast.y;
        if (this.west > this.east) {
            const temp = this.west;
            this.west = this.east;
            this.east = temp;
        }
        if (this.south > this.north) {
            const temp = this.south;
            this.south = this.north;
            this.north = temp;
        }
        return this;
    }

    /**
     * clamp south and north values
     *
     * @param south - The min south
     * @param north - The max north
     * @returns this extent
     */
    clampSouthNorth(south = this.south, north = this.north): this {
        this.south = Math.max(this.south, south);
        this.north = Math.min(this.north, north);
        return this;
    }

    /**
     * clamp west and east values
     *
     * @param west - The min west
     * @param east - The max east
     * @returns this extent
     */
    clampWestEast(west = this.west, east = this.east): this {
        this.west = Math.max(this.west, west);
        this.east = Math.min(this.east, east);
        return this;
    }

    /**
     * clamp this extent by passed extent
     *
     * @param extent - The maximum extent.
     * @returns this extent.
     */
    clampByExtent(extent: ExtentLike): this {
        this.clampSouthNorth(extent.south, extent.north);
        return this.clampWestEast(extent.west, extent.east);
    }
}

_extent = new Extent('EPSG:4326');

export default Extent;
