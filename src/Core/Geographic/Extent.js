import * as THREE from 'three';
import Coordinates, { crsToUnit, crsIsGeographic, assertCrsIsValid, convertValueToUnit } from '../Geographic/Coordinates';

/**
 * Extent is a SIG-area (so 2D)
 * It can use explicit coordinates (e.g: lon/lat) or implicit (WMTS coordinates)
 */

function _crsIsWMTS(crs) {
    return crs.indexOf('WMTS:') == 0;
}

function Extent(crs, ...values) {
    this._crs = crs;

    if (_crsIsWMTS(crs)) {
        if (values.length == 3) {
            this._zoom = values[0];
            this._row = values[1];
            this._col = values[2];

            if (this._zoom < 0) {
                throw new Error('cuck');
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
                    this._values[2 * i + j] = values[i][j];
                }
            }
        } else if (values.length == 1 && values[0].west != undefined) {
            this._values = new Float64Array(4);
            this._values[0] = values[0].west;
            this._values[1] = values[0].east;
            this._values[2] = values[0].south;
            this._values[3] = values[0].north;
        } else if (values.length == 4) {
            this._values = new Float64Array(4);
            for (let i = 0; i < 4; i++) {
                this._values[i] = values[i];
            }
        } else {
            throw new Error(`Unsupported constructor args '${values}'`);
        }
    }
}

Extent.prototype.clone = function clone() {
    if (_crsIsWMTS(this._crs)) {
        return new Extent(this._crs, this.zoom, this.row, this.col);
    } else {
        const result = Extent(this._crs, ...this._values);
        result._internalStorageUnit = this._internalStorageUnit;
        return result;
    }
};

Extent.prototype.as = function as(crs) {
    assertCrsIsValid(crs);
    if (this._crs != crs) {
        throw new Error('Unsupported yet');
    }
    if (_crsIsWMTS(this._crs)) {
        throw new Error('Unsupported yet');
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
    if (_crsIsWMTS(this.crs())) {
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
        return this._values[0];
    }
};

Extent.prototype.east = function east(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[1]);
    } else {
        return this._values[1];
    }
};

Extent.prototype.north = function north(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[3]);
    } else {
        return this._values[3];
    }
};

Extent.prototype.south = function south(unit) {
    if (crsIsGeographic(this.crs())) {
        return convertValueToUnit(this._internalStorageUnit, unit, this._values[2]);
    } else {
        return this._values[2];
    }
};

Extent.prototype.crs = function crs() {
    return this._crs;
};

Extent.prototype.center = function center() {
    if (_crsIsWMTS(this._crs)) {
        throw new Error('Invalid operation for WMTS bbox');
    }
    const c = new Coordinates(this._crs, this._values[0], this._values[2]);
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
 * @documentation: Retourne True if point is inside the bounding box
 *
 * @param point {[object Object]}
 */
Extent.prototype.isInside = function isInside(coord) {
    const c = (this.crs() == coord.crs) ? coord : coord.as(this.crs());

    // TODO this ignores altitude
    if (crsIsGeographic(this.crs())) {
        return c.longitude(this._internalStorageUnit) <= this.east() &&
               c.longitude(this._internalStorageUnit) >= this.west() &&
               c.latitude(this._internalStorageUnit) <= this.north() &&
               c.latitude(this._internalStorageUnit) >= this.south();
    } else {
        return c.x() <= this.east() &&
               c.x() >= this.west() &&
               c.y() <= this.north() &&
               c.y() >= this.south();
    }
};

Extent.prototype.isInside = function isInside(other) {
    if (_crsIsWMTS(this.crs())) {
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

        return this.east() <= o.east(this._internalStorageUnit) &&
               this.west() >= o.west(this._internalStorageUnit) &&
               this.north() <= o.north(this._internalStorageUnit) &&
               this.south() >= o.south(this._internalStorageUnit);
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
Extent.prototype.intersect = function intersect(bbox) {
    const other = bbox.as(this.crs());
    return !(this.west() >= other.east(this._internalStorageUnit) ||
             this.east() <= other.west(this._internalStorageUnit) ||
             this.south() >= other.north(this._internalStorageUnit) ||
             this.north() <= other.south(this._internalStorageUnit));
};

export default Extent;
