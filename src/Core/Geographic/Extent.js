import * as THREE from 'three';
import Coordinates, { crsToUnit, crsIsGeographic, assertCrsIsValid, convertValueToUnit, reasonnableEpsilonForUnit } from '../Geographic/Coordinates';

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

function _isTiledCRS(crs) {
    return crs.indexOf('WMTS:') == 0 ||
        crs == 'TMS';
}

function Extent(crs, ...values) {
    this._crs = crs;

    if (_isTiledCRS(crs)) {
        if (values.length == 3) {
            this._zoom = values[0];
            this._row = values[1];
            this._col = values[2];

            if (this._zoom < 0) {
                throw new Error(`invlid WTMS values ${values}`);
            }

            Object.defineProperty(this,
                'zoom',
                { get: () => this._zoom },
                { set: (z) => { this._zoom = z; } });
            Object.defineProperty(this,
                'row',
                { get: () => this._row },
                { set: (r) => { this._row = r; } });
            Object.defineProperty(this,
                'col',
                { get: () => this._col },
                { set: (c) => { this._col = c; } });
        } else {
            throw new Error(`Unsupported constructor args '${values}'`);
        }
    } else {
        this._internalStorageUnit = crsToUnit(crs);

        if (values.length === 2 &&
            values[0] instanceof Coordinates &&
            values[1] instanceof Coordinates) {
            this._values = new Float64Array(4);
            for (let i = 0; i < values.length; i++) {
                for (let j = 0; j < 2; j++) {
                    this._values[2 * i + j] = values[i]._values[j];
                }
            }
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
}

Extent.prototype.clone = function clone() {
    if (_isTiledCRS(this._crs)) {
        return new Extent(this._crs, this.zoom, this.row, this.col);
    } else {
        const result = new Extent(this._crs, ...this._values);
        result._internalStorageUnit = this._internalStorageUnit;
        return result;
    }
};

Extent.prototype.as = function as(crs) {
    assertCrsIsValid(crs);

    if (_isTiledCRS(this._crs)) {
        throw new Error('Unsupported yet');
    }

    if (this._crs != crs) {
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
            // add the internalStorageUnit to the coordinate.
            cardinals[i]._internalStorageUnit = this._internalStorageUnit;
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
        west: this.west(crsToUnit(crs)),
        east: this.east(crsToUnit(crs)),
        north: this.north(crsToUnit(crs)),
        south: this.south(crsToUnit(crs)),
    });
};

Extent.prototype.offsetToParent = function offsetToParent(other) {
    if (this.crs() != other.crs()) {
        throw new Error('unsupported mix');
    }
    if (_isTiledCRS(this.crs())) {
        const diffLevel = this._zoom - other.zoom;
        const diff = Math.pow(2, diffLevel);
        const invDiff = 1 / diff;

        const r = (this._row - (this._row % diff)) * invDiff;
        const c = (this._col - (this._col % diff)) * invDiff;

        return new THREE.Vector3(
            this._col * invDiff - c,
            this._row * invDiff - r,
            invDiff);
    }

    const dimension = {
        x: Math.abs(other.east() - other.west()),
        y: Math.abs(other.north() - other.south()),
    };

    const originX =
        (this.west(other._internalStorageUnit) - other.west()) / dimension.x;
    const originY =
        (other.north() - this.north(other._internalStorageUnit)) / dimension.y;

    const scale =
        Math.abs(
            this.east(other._internalStorageUnit) - this.west(other._internalStorageUnit)) / dimension.x;
    return new THREE.Vector3(originX, originY, scale);
};

Extent.prototype.west = function west(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[0]);
    } else {
        return this._values[CARDINAL.WEST];
    }
};

Extent.prototype.east = function east(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[1]);
    } else {
        return this._values[CARDINAL.EAST];
    }
};

Extent.prototype.north = function north(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[3]);
    } else {
        return this._values[CARDINAL.NORTH];
    }
};

Extent.prototype.south = function south(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[2]);
    } else {
        return this._values[CARDINAL.SOUTH];
    }
};

Extent.prototype.crs = function crs() {
    return this._crs;
};

Extent.prototype.center = function center(target) {
    if (_isTiledCRS(this._crs)) {
        throw new Error('Invalid operation for WMTS bbox');
    }
    let c;
    if (target) {
        Coordinates.call(target, this._crs, this._values[0], this._values[2]);
        c = target;
    } else {
        c = new Coordinates(this._crs, this._values[0], this._values[2]);
    }
    c._internalStorageUnit = this._internalStorageUnit;
    const dim = this.dimensions();
    c._values[0] += dim.x * 0.5;
    c._values[1] += dim.y * 0.5;
    return c;
};

Extent.prototype.dimensions = function dimensions(unit) {
    return {
        x: Math.abs(this.east(unit) - this.west(unit)),
        y: Math.abs(this.north(unit) - this.south(unit)),
    };
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
        return c.longitude(this._internalStorageUnit) <= this.east() + epsilon &&
               c.longitude(this._internalStorageUnit) >= this.west() - epsilon &&
               c.latitude(this._internalStorageUnit) <= this.north() + epsilon &&
               c.latitude(this._internalStorageUnit) >= this.south() - epsilon;
    } else {
        return c.x() <= this.east() + epsilon &&
               c.x() >= this.west() - epsilon &&
               c.y() <= this.north() + epsilon &&
               c.y() >= this.south() - epsilon;
    }
};

Extent.prototype.isInside = function isInside(other, epsilon) {
    if (_isTiledCRS(this.crs())) {
        if (this._zoom == other._zoom) {
            return this._row == other._row &&
                this._col == other._col;
        } else if (this._zoom < other._zoom) {
            return false;
        } else {
            const diffLevel = this._zoom - other._zoom;
            const diff = Math.pow(2, diffLevel);
            const invDiff = 1 / diff;

            const r = (this._row - (this._row % diff)) * invDiff;
            const c = (this._col - (this._col % diff)) * invDiff;
            return r == other._row && c == other._col;
        }
    } else {
        const o = other.as(this._crs);
        epsilon = epsilon == undefined ? reasonnableEpsilonForUnit(o._internalStorageUnit) : epsilon;
        // compare use crs' default storage unit
        return this.east(o._internalStorageUnit) - o.east() <= epsilon &&
               o.west() - this.west(o._internalStorageUnit) <= epsilon &&
               this.north(o._internalStorageUnit) - o.north() <= epsilon &&
               o.south() - this.south(o._internalStorageUnit) <= epsilon;
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

    var originX = (bbox.west(this._internalStorageUnit) - this.west()) / dimension.x;
    var originY = (bbox.north(this._internalStorageUnit) - this.north()) / dimension.y;

    var scale = Math.abs(bbox.east(this._internalStorageUnit) - bbox.west(this._internalStorageUnit)) / dimension.x;
    return new THREE.Vector3(originX, originY, scale);
};

/**
 * @documentation: Return true if this bounding box intersect with the bouding box parameter
 * @param {type} bbox
 * @returns {Boolean}
 */
Extent.prototype.intersectsExtent = function intersectsExtent(bbox) {
    const other = bbox.as(this.crs());
    return !(this.west() >= other.east(this._internalStorageUnit) ||
             this.east() <= other.west(this._internalStorageUnit) ||
             this.south() >= other.north(this._internalStorageUnit) ||
             this.north() <= other.south(this._internalStorageUnit));
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
    return new Extent(this.crs(),
        Math.max(this.west(), other.west(this._internalStorageUnit)),
        Math.min(this.east(), other.east(this._internalStorageUnit)),
        Math.max(this.south(), other.south(this._internalStorageUnit)),
        Math.min(this.north(), other.north(this._internalStorageUnit)));
};


Extent.prototype.set = function set(west, east, south, north) {
    this._values[CARDINAL.WEST] = west;
    this._values[CARDINAL.EAST] = east;
    this._values[CARDINAL.SOUTH] = south;
    this._values[CARDINAL.NORTH] = north;
};

Extent.prototype.union = function union(extent) {
    if (extent.crs() != this.crs()) {
        throw new Error('unsupported union between 2 diff crs');
    }
    const west = extent.west(this._internalStorageUnit);
    if (west < this.west()) {
        this._values[CARDINAL.WEST] = west;
    }

    const east = extent.east(this._internalStorageUnit);
    if (east > this.east()) {
        this._values[CARDINAL.EAST] = east;
    }

    const south = extent.south(this._internalStorageUnit);
    if (south < this.south()) {
        this._values[CARDINAL.SOUTH] = south;
    }

    const north = extent.north(this._internalStorageUnit);
    if (north > this.north()) {
        this._values[CARDINAL.NORTH] = north;
    }
};

/**
 * expandByPoint perfoms the minimal extension
 * for the point to belong to this Extent object
 * @param {Coordinates} coordinates  The coordinates to belong
 */
Extent.prototype.expandByPoint = function expandByPoint(coordinates) {
    const coords = coordinates.as(this.crs());
    const unit = coords._internalStorageUnit;
    const we = convertValueToUnit(unit, this._internalStorageUnit, coords._values[0]);
    if (we < this.west()) {
        this._values[CARDINAL.WEST] = we;
    }
    if (we > this.east()) {
        this._values[CARDINAL.EAST] = we;
    }
    const sn = convertValueToUnit(unit, this._internalStorageUnit, coords._values[1]);
    if (sn < this.south()) {
        this._values[CARDINAL.SOUTH] = sn;
    }
    if (sn > this.north()) {
        this._values[CARDINAL.NORTH] = sn;
    }
};

export default Extent;
