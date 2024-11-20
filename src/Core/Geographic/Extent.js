import * as THREE from 'three';
import * as CRS from './Crs';
import Coordinates from './Coordinates';

/**
 * Extent is a SIG-area (so 2D)
 * It can use explicit coordinates (e.g: lon/lat) or implicit (WMTS coordinates)
 */

const _dim = new THREE.Vector2();
const _dim2 = new THREE.Vector2();
const _box = new THREE.Box3();
const defaultScheme = new THREE.Vector2(2, 2);

const cNorthWest =  new Coordinates('EPSG:4326', 0, 0, 0);
const cSouthWest =  new Coordinates('EPSG:4326', 0, 0, 0);
const cNorthEast =  new Coordinates('EPSG:4326', 0, 0, 0);

const southWest = new THREE.Vector3();
const northEast = new THREE.Vector3();

/** @type {Extent} */
let _extent;

const cardinals = new Array(8);
for (let i = cardinals.length - 1; i >= 0; i--) {
    cardinals[i] = new Coordinates('EPSG:4326', 0, 0, 0);
}

const _c = new Coordinates('EPSG:4326', 0, 0);

class Extent {
    /**
     * Extent is geographical bounding rectangle defined by 4 limits: west, east, south and north.
     *
     * Warning, using geocentric projection isn't consistent with geographical extent.
     *
     * @param {String} crs projection of limit values.
     * @param {number|Array.<number>|Coordinates|Object} v0 west value, Array
     * of values [west, east, south and north], Coordinates of west-south
     * corner or object {west, east, south and north}
     * @param {number|Coordinates} [v1] east value or Coordinates of
     * east-north corner
     * @param {number} [v2] south value
     * @param {number} [v3] north value
     */
    constructor(crs, v0, v1, v2, v3) {
        if (CRS.isGeocentric(crs)) {
            throw new Error(`${crs} is a geocentric projection, it doesn't make sense with a geographical extent`);
        }

        this.isExtent = true;
        this.crs = crs;

        this.west = 0;
        this.east = 0;
        this.south = 0;
        this.north = 0;

        this.set(v0, v1, v2, v3);
    }

    /**
     * Clone this extent
     * @return {Extent} cloned extent
     */
    clone() {
        return new Extent(this.crs, this.west, this.east, this.south, this.north);
    }

    /**
     * Convert Extent to the specified projection.
     * @param {string} crs the projection of destination.
     * @param {Extent} [target] copy the destination to target.
     * @return {Extent}
     */
    as(crs, target) {
        CRS.isValid(crs);
        target = target || new Extent('EPSG:4326', [0, 0, 0, 0]);
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
     * Return the center of Extent
     * @param {Coordinates} target copy the center to the target.
     * @return {Coordinates}
     */
    center(target = new Coordinates(this.crs)) {
        this.planarDimensions(_dim);

        target.crs = this.crs;
        target.setFromValues(this.west + _dim.x * 0.5, this.south + _dim.y * 0.5);

        return target;
    }

    /**
    * Returns the dimension of the extent, in a `THREE.Vector2`.
    *
    * @param {THREE.Vector2} [target] - The target to assign the result in.
    *
    * @return {THREE.Vector2}
    */
    dimensions(target = new THREE.Vector2()) {
        console.warn('Extent.dimensions is deprecated, use planarDimensions, geodeticDimensions or spatialEuclideanDimensions');
        target.x = Math.abs(this.east - this.west);
        target.y = Math.abs(this.north - this.south);
        return target;
    }

    /**
     *  Planar dimensions are two planar distances west/east and south/north.
     *  Planar distance straight-line Euclidean distance calculated in a 2D Cartesian coordinate system.
     *
     * @param      {THREE.Vector2}  [target=new THREE.Vector2()]  The target
     * @return     {THREE.Vector2}  Planar dimensions
     */
    planarDimensions(target = new THREE.Vector2()) {
        // Calculte the dimensions for x and y
        return target.set(Math.abs(this.east - this.west), Math.abs(this.north - this.south));
    }

    /**
     *  Geodetic dimensions are two planar distances west/east and south/north.
     *  Geodetic distance is calculated in an ellispoid space as the distance
     *  across the curved surface of the world.
     *
     * @param      {THREE.Vector2}  [target=new THREE.Vector2()]  The target
     * @return     {THREE.Vector2}  geodetic dimensions
     */
    geodeticDimensions(target = new THREE.Vector2()) {
        // set 3 corners extent
        cNorthWest.crs = this.crs;
        cSouthWest.crs = this.crs;
        cNorthEast.crs = this.crs;

        cNorthWest.setFromValues(this.west, this.north, 0);
        cSouthWest.setFromValues(this.west, this.south, 0);
        cNorthEast.setFromValues(this.east, this.north, 0);

        // calcul geodetic distance northWest/northEast and northWest/southWest
        return target.set(cNorthWest.geodeticDistanceTo(cNorthEast), cNorthWest.geodeticDistanceTo(cSouthWest));
    }

    /**
     *  Spatial euclidean dimensions are two spatial euclidean distances between west/east corner and south/north corner.
     *  Spatial euclidean distance chord is calculated in a ellispoid space.
     *
     * @param      {THREE.Vector2}  [target=new THREE.Vector2()]  The target
     * @return     {THREE.Vector2}  spatial euclidean dimensions
     */
    spatialEuclideanDimensions(target = new THREE.Vector2()) {
        // set 3 corners extent
        cNorthWest.crs = this.crs;
        cSouthWest.crs = this.crs;
        cNorthEast.crs = this.crs;

        cNorthWest.setFromValues(this.west, this.north, 0);
        cSouthWest.setFromValues(this.west, this.south, 0);
        cNorthEast.setFromValues(this.east, this.north, 0);

        // calcul chord distance northWest/northEast and northWest/southWest
        return target.set(cNorthWest.spatialEuclideanDistanceTo(cNorthEast), cNorthWest.spatialEuclideanDistanceTo(cSouthWest));
    }

    /**
     * Return true if `coord` is inside the bounding box.
     *
     * @param {Coordinates} coord
     * @param {number} [epsilon=0] - to take into account when comparing to the
     * point.
     *
     * @return {boolean}
     */
    isPointInside(coord, epsilon = 0) {
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
     * Return true if `extent` is inside this extent.
     *
     * @param {Extent} extent the extent to check
     * @param {number} epsilon to take into account when comparing to the
     * point.
     *
     * @return {boolean}
     */
    isInside(extent, epsilon) {
        extent.as(this.crs, _extent);
        epsilon = epsilon ?? CRS.reasonableEpsilon(this.crs);
        return this.east - _extent.east <= epsilon &&
                _extent.west - this.west <= epsilon &&
                this.north - _extent.north <= epsilon &&
                _extent.south - this.south <= epsilon;
    }

    /**
     * Return the translation and scale to transform this extent to input extent.
     *
     * @param {Extent} extent input extent
     * @param {THREE.Vector4} target copy the result to target.
     * @return {THREE.Vector4} {x: translation on west-east, y: translation on south-north, z: scale on west-east, w: scale on south-north}
     */
    offsetToParent(extent, target = new THREE.Vector4()) {
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
     * Return true if this bounding box intersect with the bouding box parameter
     * @param {Extent} extent
     * @returns {Boolean}
     */
    intersectsExtent(extent) {
        return Extent.intersectsExtent(this, extent);
    }

    static intersectsExtent(/** @type {Extent} */extentA, /** @type {Extent} */ extentB) {
        // TODO don't work when is on limit
        const other = extentB.crs == extentA.crs ? extentB : extentB.as(extentA.crs, _extent);
        return !(extentA.west >= other.east ||
            extentA.east <= other.west ||
            extentA.south >= other.north ||
            extentA.north <= other.south);
    }

    /**
     * Return the intersection of this extent with another one
     * @param {Extent} extent
     * @returns {Extent}
     */
    intersect(extent) {
        if (!this.intersectsExtent(extent)) {
            return new Extent(this.crs, 0, 0, 0, 0);
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
     * @param {number|Array.<number>|Coordinates|Object|Extent} v0 west value,
     * Array of values [west, east, south and north], Extent of same type (tiled
     * or not), Coordinates of west-south corner or object {west, east, south
     * and north}
     * @param {number|Coordinates} [v1] east value, row value or Coordinates of
     * east-north corner
     * @param {number} [v2] south value or column value
     * @param {number} [v3] north value
     *
     * @return {Extent}
     */
    set(v0, v1, v2, v3) {
        if (v0 == undefined) {
            throw new Error('No values to set in the extent');
        }
        if (v0.isExtent) {
            v1 = v0.east;
            v2 = v0.south;
            v3 = v0.north;
            v0 = v0.west;
        }

        if (v0.isCoordinates) {
            // seem never used
            this.west = v0.x;
            this.east = v1.x;
            this.south = v0.y;
            this.north = v1.y;
        } else if (v0.west !== undefined) {
            this.west = v0.west;
            this.east = v0.east;
            this.south = v0.south;
            this.north = v0.north;
        } else if (v0.length == 4) {
            this.west = v0[0];
            this.east = v0[1];
            this.south = v0[2];
            this.north = v0[3];
        } else if (v3 !== undefined) {
            this.west = v0;
            this.east = v1;
            this.south = v2;
            this.north = v3;
        }

        return this;
    }

    /**
     * Copy to this extent to input extent.
     * @param {Extent} extent
     * @return {Extent} copied extent
     */
    copy(extent) {
        this.crs = extent.crs;
        return this.set(extent);
    }

    /**
     * Union this extent with the input extent.
     * @param {Extent} extent the extent to union.
     */
    union(extent) {
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
     * @param {Coordinates} coordinates  The coordinates to belong
     */
    expandByCoordinates(coordinates) {
        const coords = coordinates.crs == this.crs ? coordinates : coordinates.as(this.crs, _c);
        this.expandByValuesCoordinates(coords.x, coords.y);
    }

    /**
    * expandByValuesCoordinates perfoms the minimal extension
    * for the coordinates values to belong to this Extent object
    * @param {number} we  The coordinate on west-east
    * @param {number} sn  The coordinate on south-north
    *
    */
    expandByValuesCoordinates(we, sn) {
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
     * @param {string} crs Projection of extent to instancied.
     * @param {THREE.Box3} box
     * @return {Extent}
     */
    static fromBox3(crs, box) {
        if (CRS.isGeocentric(crs)) {
            // if geocentric reproject box on 'EPSG:4326'
            crs = 'EPSG:4326';
            box = _box.copy(box);

            cSouthWest.crs = crs;
            cSouthWest.setFromVector3(box.min).as(crs, cSouthWest).toVector3(box.min);
            cNorthEast.crs = crs;
            cNorthEast.setFromVector3(box.max).as(crs, cNorthEast).toVector3(box.max);
        }

        return new Extent(crs, {
            west: box.min.x,
            east: box.max.x,
            south: box.min.y,
            north: box.max.y,
        });
    }

    /**
     * Return values of extent in string, separated by the separator input.
     * @param {string} separator
     * @return {string}
     */
    toString(separator = '') {
        return `${this.east}${separator}${this.north}${separator}${this.west}${separator}${this.south}`;
    }

    /**
     * Subdivide equally an extent from its center to return four extents:
     * north-west, north-east, south-west and south-east.
     *
     * @returns {Extent[]} An array containing the four sections of the extent. The
     * order of the sections is [NW, NE, SW, SE].
     */
    subdivision() {
        return this.subdivisionByScheme();
    }
    /**
     * subdivise extent by scheme.x on west-east and scheme.y on south-north.
     *
     * @param      {THREE.Vector2}  [scheme=Vector2(2,2)]  The scheme to subdivise.
     * @return     {Array<Extent>}   subdivised extents.
     */
    subdivisionByScheme(scheme = defaultScheme) {
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
     * Multiplies all extent `coordinates` (with an implicit 1 in the 4th dimension) and `matrix`.
     *
     * @param      {THREE.Matrix4}  matrix  The matrix
     * @return     {Extent}  return this extent instance.
     */
    applyMatrix4(matrix) {
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
     * @param      {number}  [south=this.south]  The min south
     * @param      {number}  [north=this.north]  The max north
     * @return     {Extent}  this extent
     */
    clampSouthNorth(south = this.south, north = this.north) {
        this.south = Math.max(this.south, south);
        this.north = Math.min(this.north, north);
        return this;
    }

    /**
     * clamp west and east values
     *
     * @param      {number}  [west=this.west]  The min west
     * @param      {number}  [east=this.east]  The max east
     * @return     {Extent}  this extent
     */
    clampWestEast(west = this.west, east = this.east) {
        this.west = Math.max(this.west, west);
        this.east = Math.min(this.east, east);
        return this;
    }
    /**
     * clamp this extent by passed extent
     *
     * @param      {Extent}  extent  The maximum extent.
     * @return     {Extent}  this extent.
     */
    clampByExtent(extent) {
        this.clampSouthNorth(extent.south, extent.north);
        return this.clampWestEast(extent.west, extent.east);
    }
}

_extent = new Extent('EPSG:4326', [0, 0, 0, 0]);

export default Extent;
