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

/**
 * @class      Extent
 * @param      {string}          crs     projection crs (ex: 'EPSG:4326')
 * @param      {(Array|object|Number)}  values  west, east, south and north values
 */
function Extent(crs, ...values) {
    this._crs = crs;

    if (this.isTiledCrs()) {
        if (values.length == 3) {
            this.zoom = values[0];
            this.row = values[1];
            this.col = values[2];

            if (this.zoom < 0) {
                throw new Error(`invlid WTMS values ${values}`);
            }
        } else {
            throw new Error(`Unsupported constructor args '${values}'`);
        }
    } else if (values.length === 2 &&
        values[0] instanceof Coordinates &&
        values[1] instanceof Coordinates) {
        this._values = new Float64Array(4);
        this._values[CARDINAL.WEST] = values[0]._values[0];
        this._values[CARDINAL.EAST] = values[1]._values[0];
        this._values[CARDINAL.SOUTH] = values[0]._values[1];
        this._values[CARDINAL.NORTH] = values[1]._values[1];
    } else if (values.length == 1 && values[0].west != undefined) {
        this._values = new Float64Array(4);
        this._values[CARDINAL.WEST] = values[0].west;
        this._values[CARDINAL.EAST] = values[0].east;
        this._values[CARDINAL.SOUTH] = values[0].south;
        this._values[CARDINAL.NORTH] = values[0].north;
    } else if (values.length == 4) {
        this._values = new Float64Array(4);
        Object.keys(CARDINAL).forEach((key) => {
            const cardinal = CARDINAL[key];
            this._values[cardinal] = values[cardinal];
        });
    } else {
        throw new Error(`Unsupported constructor args '${values}'`);
    }
}

Extent.prototype.clone = function clone() {
    if (this.isTiledCrs()) {
        return new Extent(this._crs, this.zoom, this.row, this.col);
    } else {
        const result = new Extent(this._crs, ...this._values);
        return result;
    }
};

Extent.prototype.isTiledCrs = function fnIsTiledCrs() {
    return this._crs.indexOf('WMTS:') == 0 || this._crs == 'TMS';
};

// EPSG:3857
// WGS84 bounds [-180.0, -85.06, 180.0, 85.06] (https://epsg.io/3857)
// Warning, some tiled source don't exactly match the same bound
// It should be taken into account
const coord = new Coordinates('EPSG:4326', 180, 85.06);
coord.as('EPSG:3857', coord);
// Get bound dimension in 'EPSG:3857'
const sizeX = coord._values[0] * 2;
const sizeY = coord._values[1] * 2;

Extent.prototype.as = function as(crs) {
    assertCrsIsValid(crs);

    if (this.isTiledCrs()) {
        if (this._crs == 'WMTS:PM' || this._crs == 'TMS') {
            // Convert this to the requested crs by using 4326 as an intermediate state.
            const nbCol = 2 ** this.zoom;
            const nbRow = nbCol;
            const sizeRow = 1.0 / nbRow;
            // convert row PM to Y PM
            const Yn = 1 - sizeRow * (nbRow - this.row);
            const Ys = Yn + sizeRow;

            // convert to EPSG:3857
            if (crs == 'EPSG:3857') {
                const west = (0.5 - sizeRow * (nbCol - this.col)) * sizeX;
                const east = west + sizeRow * sizeX;
                const south = (0.5 - Ys) * sizeY;
                const north = (0.5 - Yn) * sizeY;
                return new Extent('EPSG:3857', { west, east, south, north }).as(crs);
            } else {
                const size = 360 / nbCol;
                // convert Y PM to latitude EPSG:4326 degree
                const north = Projection.YToWGS84(Yn);
                const south = Projection.YToWGS84(Ys);
                // convert column PM to longitude EPSG:4326 degree
                const west = 180 - size * (nbCol - this.col);
                const east = west + size;

                const extent = Extent('EPSG:4326', { west, east, south, north });
                if (crs == 'EPSG:4326') {
                    return extent;
                } else {
                    // convert in new crs
                    return extent.as(crs);
                }
            }
        } else if (this._crs == 'WMTS:WGS84G' && crs == 'EPSG:4326') {
            const nbRow = 2 ** this.zoom;
            const size = 180 / nbRow;
            const north = size * (nbRow - this.row) - 90;
            const south = size * (nbRow - (this.row + 1)) - 90;
            const west = 180 - size * (2 * nbRow - this.col);
            const east = 180 - size * (2 * nbRow - (this.col + 1));

            return new Extent(crs, { west, east, south, north });
        } else {
            throw new Error('Unsupported yet');
        }
    }

    if (this._crs != crs && !(is4326(this._crs) && is4326(crs))) {
        // Compute min/max in x/y by projecting 8 cardinal points,
        // and then taking the min/max of each coordinates.
        const cardinals = [];
        const c = this.center();
        cardinals.push(new Coordinates(this._crs, this.west(), this.north()));
        cardinals.push(new Coordinates(this._crs, c._values[0], this.north()));
        cardinals.push(new Coordinates(this._crs, this.east(), this.north()));
        cardinals.push(new Coordinates(this._crs, this.east(), c._values[1]));
        cardinals.push(new Coordinates(this._crs, this.east(), this.south()));
        cardinals.push(new Coordinates(this._crs, c._values[0], this.south()));
        cardinals.push(new Coordinates(this._crs, this.west(), this.south()));
        cardinals.push(new Coordinates(this._crs, this.west(), c._values[1]));

        let north = -Infinity;
        let south = Infinity;
        let east = -Infinity;
        let west = Infinity;
        // loop over the coordinates
        for (let i = 0; i < cardinals.length; i++) {
            // convert the coordinate.
            cardinals[i] = cardinals[i].as(crs);
            north = Math.max(north, cardinals[i]._values[1]);
            south = Math.min(south, cardinals[i]._values[1]);
            east = Math.max(east, cardinals[i]._values[0]);
            west = Math.min(west, cardinals[i]._values[0]);
        }
        return new Extent(crs, { north, south, east, west });
    }

    return new Extent(crs, {
        west: this.west(),
        east: this.east(),
        north: this.north(),
        south: this.south(),
    });
};

Extent.prototype.offsetToParent = function offsetToParent(other, target = new THREE.Vector4()) {
    if (this.crs() != other.crs()) {
        throw new Error('unsupported mix');
    }
    if (this.isTiledCrs()) {
        const diffLevel = this.zoom - other.zoom;
        const diff = 2 ** diffLevel;
        const invDiff = 1 / diff;

        const r = (this.row - (this.row % diff)) * invDiff;
        const c = (this.col - (this.col % diff)) * invDiff;

        return target.set(
            this.col * invDiff - c,
            this.row * invDiff - r,
            invDiff, invDiff);
    }

    const dimension = {
        x: Math.abs(other.east() - other.west()),
        y: Math.abs(other.north() - other.south()),
    };

    const originX =
        (this.west() - other.west()) / dimension.x;
    const originY =
        (other.north() - this.north()) / dimension.y;

    const scaleX =
        Math.abs(
            this.east() - this.west()) / dimension.x;

    const scaleY =
        Math.abs(
            this.north() - this.south()) / dimension.y;

    return target.set(originX, originY, scaleX, scaleY);
};

Extent.prototype.west = function west() {
    return this._values[CARDINAL.WEST];
};

Extent.prototype.east = function east() {
    return this._values[CARDINAL.EAST];
};

Extent.prototype.north = function north() {
    return this._values[CARDINAL.NORTH];
};

Extent.prototype.south = function south() {
    return this._values[CARDINAL.SOUTH];
};

Extent.prototype.crs = function crs() {
    return this._crs;
};

Extent.prototype.center = function center(target) {
    if (this.isTiledCrs()) {
        throw new Error('Invalid operation for WMTS bbox');
    }
    let c;
    if (target) {
        Coordinates.call(target, this._crs, this._values[0], this._values[2]);
        c = target;
    } else {
        c = new Coordinates(this._crs, this._values[0], this._values[2]);
    }
    const dim = this.dimensions();
    c._values[0] += dim.x * 0.5;
    c._values[1] += dim.y * 0.5;
    return c;
};

Extent.prototype.dimensions = function dimensions(target) {
    target = target || { x: 0, y: 0 };
    target.x = Math.abs(this.east() - this.west());
    target.y = Math.abs(this.north() - this.south());
    return target;
};

/**
 * Return true if coord is inside the bounding box.
 *
 * @param {Coordinates} coord
 * @param {number} epsilon coord is inside the extent (+/- epsilon)
 * @return {boolean}
 */
Extent.prototype.isPointInside = function isPointInside(coord, epsilon = 0) {
    const c = (this.crs() == coord.crs) ? coord : coord.as(this.crs());
    // TODO this ignores altitude
    if (crsIsGeographic(this.crs())) {
        return c.longitude() <= this.east() + epsilon &&
               c.longitude() >= this.west() - epsilon &&
               c.latitude() <= this.north() + epsilon &&
               c.latitude() >= this.south() - epsilon;
    } else {
        return c.x() <= this.east() + epsilon &&
               c.x() >= this.west() - epsilon &&
               c.y() <= this.north() + epsilon &&
               c.y() >= this.south() - epsilon;
    }
};

Extent.prototype.isInside = function isInside(other, epsilon) {
    if (this.isTiledCrs()) {
        if (this.zoom == other.zoom) {
            return this.row == other.row &&
                this.col == other.col;
        } else if (this.zoom < other.zoom) {
            return false;
        } else {
            const diffLevel = this.zoom - other.zoom;
            const diff = 2 ** diffLevel;
            const invDiff = 1 / diff;

            const r = (this.row - (this.row % diff)) * invDiff;
            const c = (this.col - (this.col % diff)) * invDiff;
            return r == other.row && c == other.col;
        }
    } else {
        const o = other.as(this._crs);
        epsilon = epsilon == undefined ? reasonnableEpsilonForCRS(this._crs) : epsilon;
        return this.east() - o.east() <= epsilon &&
               o.west() - this.west() <= epsilon &&
               this.north() - o.north() <= epsilon &&
               o.south() - this.south() <= epsilon;
    }
};

Extent.prototype.offsetScale = function offsetScale(bbox) {
    if (bbox.crs() != this.crs()) {
        throw new Error('unsupported offscale between 2 diff crs');
    }

    const dimension = {
        x: Math.abs(this.east() - this.west()),
        y: Math.abs(this.north() - this.south()),
    };

    var originX = (bbox.west() - this.west()) / dimension.x;
    var originY = (bbox.north() - this.north()) / dimension.y;

    var scaleX = Math.abs(bbox.east() - bbox.west()) / dimension.x;
    var scaleY = Math.abs(bbox.north() - bbox.south()) / dimension.y;

    return new THREE.Vector4(originX, originY, scaleX, scaleY);
};

/**
 * @documentation: Return true if this bounding box intersect with the bouding box parameter
 * @param {type} bbox
 * @returns {Boolean}
 */
Extent.prototype.intersectsExtent = function intersectsExtent(bbox) {
    const other = bbox.crs() == this.crs() ? bbox : bbox.as(this.crs());
    return !(this.west() >= other.east() ||
             this.east() <= other.west() ||
             this.south() >= other.north() ||
             this.north() <= other.south());
};

/**
 * @documentation: Return the intersection of this extent with another one
 * @param {type} other
 * @returns {Boolean}
 */
Extent.prototype.intersect = function intersect(other) {
    if (!this.intersectsExtent(other)) {
        return new Extent(this.crs(), 0, 0, 0, 0);
    }
    if (other.crs() != this.crs()) {
        other = other.as(this.crs());
    }
    const extent = new Extent(this.crs(),
        Math.max(this.west(), other.west()),
        Math.min(this.east(), other.east()),
        Math.max(this.south(), other.south()),
        Math.min(this.north(), other.north()));

    return extent;
};


Extent.prototype.set = function set(...values) {
    if (this.isTiledCrs()) {
        this.zoom = values[0];
        this.row = values[1];
        this.col = values[2];
    } else {
        Object.keys(CARDINAL).forEach((key) => {
            const cardinal = CARDINAL[key];
            this._values[cardinal] = values[cardinal];
        });
    }
    return this;
};

Extent.prototype.union = function union(extent) {
    if (extent.crs() != this.crs()) {
        throw new Error('unsupported union between 2 diff crs');
    }
    const west = extent.west();
    if (west < this.west()) {
        this._values[CARDINAL.WEST] = west;
    }

    const east = extent.east();
    if (east > this.east()) {
        this._values[CARDINAL.EAST] = east;
    }

    const south = extent.south();
    if (south < this.south()) {
        this._values[CARDINAL.SOUTH] = south;
    }

    const north = extent.north();
    if (north > this.north()) {
        this._values[CARDINAL.NORTH] = north;
    }
};

/**
 * expandByPoint perfoms the minimal extension
 * for the point to belong to this Extent object
 * @param {Coordinates} coordinates  The coordinates to belong
 */
const c = new Coordinates('EPSG:4326', 0, 0, 0);
Extent.prototype.expandByPoint = function expandByPoint(coordinates) {
    const coords = coordinates.crs == this.crs() ? coordinates : coordinates.as(this.crs(), c);
    const we = coords._values[0];
    if (we < this.west()) {
        this._values[CARDINAL.WEST] = we;
    }
    if (we > this.east()) {
        this._values[CARDINAL.EAST] = we;
    }
    const sn = coords._values[1];
    if (sn < this.south()) {
        this._values[CARDINAL.SOUTH] = sn;
    }
    if (sn > this.north()) {
        this._values[CARDINAL.NORTH] = sn;
    }
};

Extent.fromBox3 = function fromBox3(crs, box) {
    return new Extent(crs, {
        west: box.min.x,
        east: box.max.x,
        south: box.min.y,
        north: box.max.y,
    });
};

Extent.prototype.extentParent = function extentParent(levelParent) {
    if (this.isTiledCrs()) {
        if (levelParent && levelParent < this.zoom) {
            const diffLevel = this.zoom - levelParent;
            const diff = 2 ** diffLevel;
            const invDiff = 1 / diff;

            const r = (this.row - (this.row % diff)) * invDiff;
            const c = (this.col - (this.col % diff)) * invDiff;

            return new Extent(this.crs(), levelParent, r, c);
        } else {
            return this;
        }
    }
};

Extent.prototype.toString = function toString(separator = '') {
    if (this.isTiledCrs()) {
        return `${this.zoom}${separator}${this.row}${separator}${this.col}`;
    } else {
        return `${this.east()}${separator}${this.north()}${separator}${this.west()}${separator}${this.south()}`;
    }
};

const center = new Coordinates('EPSG:4326', 0, 0, 0);
/**
 * Subdivide equally an extent from its center to return four extents:
 * north-west, north-east, south-west and south-east.
 *
 * @returns {Extent[]} An array containing the four sections of the extent. The
 * order of the sections is [NW, NE, SW, SE].
 */
Extent.prototype.subdivision = function subdivision() {
    this.center(center);

    const northWest = new Extent(this.crs(),
        this.west(), center._values[0],
        center._values[1], this.north());
    const northEast = new Extent(this.crs(),
        center._values[0], this.east(),
        center._values[1], this.north());
    const southWest = new Extent(this.crs(),
        this.west(), center._values[0],
        this.south(), center._values[1]);
    const southEast = new Extent(this.crs(),
        center._values[0], this.east(),
        this.south(), center._values[1]);

    return [northWest, northEast, southWest, southEast];
};

export default Extent;
