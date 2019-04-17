import * as THREE from 'three';
import Coordinates, { crsIsGeographic, assertCrsIsValid, reasonnableEpsilonForCRS, is4326 } from 'Core/Geographic/Coordinates';
import Projection from 'Core/Geographic/Projection';

/**
 * Extent is a SIG-area (so 2D)
 * It can use explicit coordinates (e.g: lon/lat) or implicit (WMTS coordinates)
 */

const CARDINAL = {
    WEST: 0,
    EAST: 1,
    SOUTH: 2,
    NORTH: 3,
};

const _dim = new THREE.Vector2();
const _dim2 = new THREE.Vector2();
const r = { row: 0, col: 0, invDiff: 0 };

function _rowColfromParent(extent, zoom) {
    const diffLevel = extent.zoom - zoom;
    const diff = 2 ** diffLevel;
    r.invDiff = 1 / diff;

    r.row = (extent.row - (extent.row % diff)) * r.invDiff;
    r.col = (extent.col - (extent.col % diff)) * r.invDiff;
    return r;
}

let _extent;

const cardinals = [];
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));
cardinals.push(new Coordinates('EPSG:4326', 0, 0, 0, 0));

const _c = new Coordinates('EPSG:4326', 0, 0);
// EPSG:3857
// WGS84 bounds [-20026376.39 -20048966.10 20026376.39 20048966.10] (https://epsg.io/3857)
// Warning, some tiled source don't exactly match the same bound
// It should be taken into account
export const worldDimension3857 = { x: 20026376.39 * 2, y: 20048966.10 * 2 };

class Extent {
    /**
     * Extent is geographical bounding rectangle defined by 4 limits: west, east, south and north.
     * If crs is tiled projection (WMTS or TMS), the extent is defined by zoom, row and column.
     *
     * @param {String} crs projection of limit values.
     * @param {number|Array.<number>|Coordinates|Object} v0 west value, zoom value, Array of values [west, east, south and north],
     * Coordinates of west-south corner or object {west, east, south and north}
     * @param {number|Coordinates} [v1] east value, row value or Coordinates of east-north corner
     * @param {number} [v2] south value or column value
     * @param {number} [v3] north value
     */
    constructor(crs, v0, v1, v2, v3) {
        this.crs = crs;

        if (this.isTiledCrs()) {
            if (v0 !== undefined) {
                this.zoom = v0;
                this.row = v1;
                this.col = v2;

                if (this.zoom < 0) {
                    throw new Error('invlid WTMS values');
                }
            } else {
                throw new Error('Unsupported constructor args');
            }
        } else if (v0 instanceof Coordinates) {
            // seem never used
            this._values = new Float64Array([v0._values[0], v1._values[0], v0._values[1], v1._values[1]]);
        } else if (v0 && v0.west !== undefined) {
            this._values = new Float64Array([v0.west, v0.east, v0.south, v0.north]);
        } else if (v0 && v0.length == 4) {
            this._values = new Float64Array(v0);
        } else if (v0 !== undefined) {
            this._values = new Float64Array([v0, v1, v2, v3]);
        } else {
            throw new Error('Unsupported constructor args');
        }
    }

    /**
     * Clone this extent
     * @return {Extent} cloned extent
     */
    clone() {
        if (this.isTiledCrs()) {
            return new Extent(this.crs, this.zoom, this.row, this.col);
        } else {
            return new Extent(this.crs, this._values);
        }
    }

    /**
     * Return true is tiled Extent (WGS84, PM)
     * @return {boolean}
     */
    isTiledCrs() {
        return this.crs.indexOf('WMTS:') == 0 || this.crs == 'TMS';
    }

    /**
     * Convert Extent to the specified projection.
     * @param {string} crs the projection of destination.
     * @param {Extent} target copy the destination to target.
     * @return {Extent}
     */
    as(crs, target) {
        assertCrsIsValid(crs);
        if (this.isTiledCrs()) {
            if (this.crs == 'WMTS:PM' || this.crs == 'TMS') {
                if (!target) {
                    target = new Extent('EPSG:4326', [0, 0, 0, 0]);
                }
                // Convert this to the requested crs by using 4326 as an intermediate state.
                const nbCol = 2 ** this.zoom;
                const nbRow = nbCol;
                const sizeRow = 1.0 / nbRow;
                // convert row PM to Y PM
                const Yn = 1 - sizeRow * (nbRow - this.row);
                const Ys = Yn + sizeRow;

                // convert to EPSG:3857
                if (crs == 'EPSG:3857') {
                    const west = (0.5 - sizeRow * (nbCol - this.col)) * worldDimension3857.x;
                    const east = west + sizeRow * worldDimension3857.x;
                    const south = (0.5 - Ys) * worldDimension3857.y;
                    const north = (0.5 - Yn) * worldDimension3857.y;
                    target.set(west, east, south, north);
                    target.crs = 'EPSG:3857';
                    return target.as(crs, target);
                } else {
                    const size = 360 / nbCol;
                    // convert Y PM to latitude EPSG:4326 degree
                    const north = Projection.YToWGS84(Yn);
                    const south = Projection.YToWGS84(Ys);
                    // convert column PM to longitude EPSG:4326 degree
                    const west = 180 - size * (nbCol - this.col);
                    const east = west + size;

                    target.set(west, east, south, north);
                    target.crs = 'EPSG:4326';
                    if (crs == 'EPSG:4326') {
                        return target;
                    } else {
                        // convert in new crs
                        return target.as(crs, target);
                    }
                }
            } else if (this.crs == 'WMTS:WGS84G' && crs == 'EPSG:4326') {
                if (!target) {
                    target = new Extent('EPSG:4326', [0, 0, 0, 0]);
                }
                const nbRow = 2 ** this.zoom;
                const size = 180 / nbRow;
                const north = size * (nbRow - this.row) - 90;
                const south = size * (nbRow - (this.row + 1)) - 90;
                const west = 180 - size * (2 * nbRow - this.col);
                const east = 180 - size * (2 * nbRow - (this.col + 1));

                target.set(west, east, south, north);
                target.crs = crs;
                return target;
            } else {
                throw new Error('Unsupported yet');
            }
        }

        if (!target) {
            target = new Extent('EPSG:4326', [0, 0, 0, 0]);
        }
        if (this.crs != crs && !(is4326(this.crs) && is4326(crs))) {
            // Compute min/max in x/y by projecting 8 cardinal points,
            // and then taking the min/max of each coordinates.
            const center = this.center(_c);
            cardinals[0].set(this.crs, this.west, this.north);
            cardinals[1].set(this.crs, center._values[0], this.north);
            cardinals[2].set(this.crs, this.east, this.north);
            cardinals[3].set(this.crs, this.east, center._values[1]);
            cardinals[4].set(this.crs, this.east, this.south);
            cardinals[5].set(this.crs, center._values[0], this.south);
            cardinals[6].set(this.crs, this.west, this.south);
            cardinals[7].set(this.crs, this.west, center._values[1]);

            let north = -Infinity;
            let south = Infinity;
            let east = -Infinity;
            let west = Infinity;
            // loop over the coordinates
            for (let i = 0; i < cardinals.length; i++) {
                // convert the coordinate.
                cardinals[i].as(crs, _c);
                north = Math.max(north, _c._values[1]);
                south = Math.min(south, _c._values[1]);
                east = Math.max(east, _c._values[0]);
                west = Math.min(west, _c._values[0]);
            }

            target.set(west, east, south, north);
            target.crs = crs;
            return target;
        }

        target.crs = crs;
        target.set(this.west, this.east, this.south, this.north);

        return target;
    }

    /**
     * Return the west value
     * @return {number}
     */
    get west() {
        return this._values[CARDINAL.WEST];
    }

    /**
     * Return the east value
     * @return {number}
     */
    get east() {
        return this._values[CARDINAL.EAST];
    }

    /**
     * Return the north value
     * @return {number}
     */
    get north() {
        return this._values[CARDINAL.NORTH];
    }

    /**
    * Return the south value
    * @return {number}
    */
    get south() {
        return this._values[CARDINAL.SOUTH];
    }

    /**
     * Return the center of Extent
     * @param {Coordinates} target copy the center to the target.
     * @return {Coordinates}
     */
    center(target) {
        if (this.isTiledCrs()) {
            throw new Error('Invalid operation for WMTS bbox');
        }
        this.dimensions(_dim);
        if (target) {
            target.set(this.crs, this._values[0] + _dim.x * 0.5, this._values[2] + _dim.y * 0.5);
        } else {
            target = new Coordinates(this.crs, this._values[0] + _dim.x * 0.5, this._values[2] + _dim.y * 0.5);
        }
        return target;
    }

    /**
    * Returns the dimension of the extent, in a <code>THREE.Vector2</code>.
    *
    * @param {THREE.Vector2} [target] - The target to assign the result in.
    *
    * @return {THREE.Vector2}
    */
    dimensions(target = new THREE.Vector2()) {
        target.x = Math.abs(this.east - this.west);
        target.y = Math.abs(this.north - this.south);
        return target;
    }

    /**
     * Return true if <code>coord</code> is inside the bounding box.
     *
     * @param {Coordinates} coord
     * @param {number} [epsilon=0] - to take into account when comparing to the
     * point.
     *
     * @return {boolean}
     */
    isPointInside(coord, epsilon = 0) {
        const c = (this.crs == coord.crs) ? coord : coord.as(this.crs, _c);
        // TODO this ignores altitude
        if (crsIsGeographic(this.crs)) {
            return c.longitude() <= this.east + epsilon &&
                   c.longitude() >= this.west - epsilon &&
                   c.latitude() <= this.north + epsilon &&
                   c.latitude() >= this.south - epsilon;
        } else {
            return c.x() <= this.east + epsilon &&
                   c.x() >= this.west - epsilon &&
                   c.y() <= this.north + epsilon &&
                   c.y() >= this.south - epsilon;
        }
    }

    /**
     * Return true if <code>extent</code> is inside this extent.
     *
     * @param {Extent} extent the extent to check
     * @param {number} epsilon to take into account when comparing to the
     * point.
     *
     * @return {boolean}
     */
    isInside(extent, epsilon) {
        if (this.isTiledCrs()) {
            if (this.zoom == extent.zoom) {
                return this.row == extent.row &&
                    this.col == extent.col;
            } else if (this.zoom < extent.zoom) {
                return false;
            } else {
                _rowColfromParent(this, extent.zoom);
                return r.row == extent.row && r.col == extent.col;
            }
        } else {
            extent.as(this.crs, _extent);
            epsilon = epsilon == undefined ? reasonnableEpsilonForCRS(this.crs) : epsilon;
            return this.east - _extent.east <= epsilon &&
                   _extent.west - this.west <= epsilon &&
                   this.north - _extent.north <= epsilon &&
                   _extent.south - this.south <= epsilon;
        }
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
        if (this.isTiledCrs()) {
            _rowColfromParent(this, extent.zoom);
            return target.set(
                this.col * r.invDiff - r.col,
                this.row * r.invDiff - r.row,
                r.invDiff, r.invDiff);
        }

        extent.dimensions(_dim);
        this.dimensions(_dim2);

        const originX = (this.west - extent.west) / _dim.x;
        const originY = (extent.north - this.north) / _dim.y;

        const scaleX = _dim2.x / _dim.x;
        const scaleY = _dim2.y / _dim.y;

        return target.set(originX, originY, scaleX, scaleY);
    }

    /**
     * Return parent tiled extent with input level
     *
     * @param {number} levelParent level of parent.
     * @return {Extent}
     */
    tiledExtentParent(levelParent) {
        if (levelParent && levelParent < this.zoom) {
            _rowColfromParent(this, levelParent);
            return new Extent(this.crs, levelParent, r.row, r.col);
        } else {
            return this;
        }
    }

    /**
     * Return true if this bounding box intersect with the bouding box parameter
     * @param {Extent} extent
     * @returns {Boolean}
     */
    intersectsExtent(extent) {
        const other = extent.crs == this.crs ? extent : extent.as(this.crs, _extent);
        return !(this.west >= other.east ||
                 this.east <= other.west ||
                 this.south >= other.north ||
                 this.north <= other.south);
    }

    /**
     * Return the intersection of this extent with another one
     * @param {Extent} extent
     * @returns {Boolean}
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
     * Or if tiled extent, set zoom, row and column values
     * @param {number} v0 west or zoom value
     * @param {number} v1 east or row value
     * @param {number} v2 south or column value
     * @param {number} v3 north value
     * @return {Extent}
     */
    set(v0, v1, v2, v3) {
        if (this.isTiledCrs()) {
            this.zoom = v0;
            this.row = v1;
            this.col = v2;
        } else {
            this._values[CARDINAL.WEST] = v0;
            this._values[CARDINAL.EAST] = v1;
            this._values[CARDINAL.SOUTH] = v2;
            this._values[CARDINAL.NORTH] = v3;
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
        if (this.isTiledCrs()) {
            this.set(extent.zoom, extent.row, extent.col);
        } else {
            this.set(extent._values[0], extent._values[1], extent._values[2], extent._values[3]);
        }
        return this;
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
                this._values[CARDINAL.WEST] = west;
            }

            const east = extent.east;
            if (east > this.east) {
                this._values[CARDINAL.EAST] = east;
            }

            const south = extent.south;
            if (south < this.south) {
                this._values[CARDINAL.SOUTH] = south;
            }

            const north = extent.north;
            if (north > this.north) {
                this._values[CARDINAL.NORTH] = north;
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
        this.expandByValuesCoordinates(coords._values[0], coords._values[1]);
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
            this._values[CARDINAL.WEST] = we;
        }
        if (we > this.east) {
            this._values[CARDINAL.EAST] = we;
        }
        if (sn < this.south) {
            this._values[CARDINAL.SOUTH] = sn;
        }
        if (sn > this.north) {
            this._values[CARDINAL.NORTH] = sn;
        }
    }

    /**
     * Instance Extent with THREE.Box2
     * @param {string} crs Projection of extent to instancied.
     * @param {THREE.Box2} box
     * @return {Extent}
     */
    static fromBox3(crs, box) {
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
        if (this.isTiledCrs()) {
            return `${this.zoom}${separator}${this.row}${separator}${this.col}`;
        } else {
            return `${this.east}${separator}${this.north}${separator}${this.west}${separator}${this.south}`;
        }
    }

    /**
     * Subdivide equally an extent from its center to return four extents:
     * north-west, north-east, south-west and south-east.
     *
     * @returns {Extent[]} An array containing the four sections of the extent. The
     * order of the sections is [NW, NE, SW, SE].
     */
    subdivision() {
        this.center(_c);

        const northWest = new Extent(this.crs,
            this.west, _c._values[0],
            _c._values[1], this.north);
        const northEast = new Extent(this.crs,
            _c._values[0], this.east,
            _c._values[1], this.north);
        const southWest = new Extent(this.crs,
            this.west, _c._values[0],
            this.south, _c._values[1]);
        const southEast = new Extent(this.crs,
            _c._values[0], this.east,
            this.south, _c._values[1]);

        return [northWest, northEast, southWest, southEast];
    }

    /**
     * Apply transform and copy this extent to input.
     * The <code>transformedCopy</code> doesn't handle
     * the issue of overflow of geographic limits.
     * @param {THREE.Vector2} t translation transform
     * @param {THREE.Vector2} s scale transform
     * @param {Extent} extent Extent to copy after transformation.
     */
    transformedCopy(t, s, extent) {
        if (!extent.isTiledCrs()) {
            this.crs = extent.crs;
            this._values[0] = (extent._values[0] + t.x) * s.x;
            this._values[1] = (extent._values[1] + t.x) * s.x;
            if (this._values[0] > this._values[1]) {
                const temp = this._values[0];
                this._values[0] = this._values[1];
                this._values[1] = temp;
            }
            this._values[2] = (extent._values[2] + t.y) * s.y;
            this._values[3] = (extent._values[3] + t.y) * s.y;
            if (this._values[2] > this._values[3]) {
                const temp = this._values[2];
                this._values[2] = this._values[3];
                this._values[3] = temp;
            }
        }
    }
}

_extent = new Extent('EPSG:4326', [0, 0, 0, 0]);

export default Extent;
