/**
 * Generated On: 2015-10-5
 * Class: BoundingBox
 * Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
 */

import * as THREE from 'three';
import Coordinates, { crsToUnit, crsIsGeographic, assertCrsIsValid } from '../Geographic/Coordinates';

/**
 *
 * @param {type} west : longitude minimum
 * @param {type} east : longitude maximum
 * @param {type} south  : latitude minimum
 * @param {type} north  : latitude maximum
 * @param {type} parentCenter : center parent
 * @param {type} minAltitude  : altitude minimum
 * @param {type} maxAltitude  : altitude maximum
 * @returns {BoundingBox_L7.BoundingBox}
 */

function BoundingBox(crs, west, east, south, north, minAltitude, maxAltitude) {
    assertCrsIsValid(crs);

    this.minCoordinate = new Coordinates(crs, west, south, minAltitude || 0);
    this.maxCoordinate = new Coordinates(crs, east, north, maxAltitude || 0);
}

BoundingBox.prototype.as = function as(crs) {
    const mi = this.minCoordinate.as(crs);
    const ma = this.maxCoordinate.as(crs);
    return new BoundingBox(crs,
        mi._values[0], ma._values[0],
        mi._values[1], ma._values[1],
        mi._values[2], ma._values[2]);
};

BoundingBox.prototype.west = function west(unit) {
    if (crsIsGeographic(this.crs())) {
        return this.minCoordinate.longitude(unit);
    } else {
        return this.minCoordinate.x();
    }
};

BoundingBox.prototype.east = function east(unit) {
    if (crsIsGeographic(this.crs())) {
        return this.maxCoordinate.longitude(unit);
    } else {
        return this.maxCoordinate.x();
    }
};

BoundingBox.prototype.north = function north(unit) {
    if (crsIsGeographic(this.crs())) {
        return this.maxCoordinate.latitude(unit);
    } else {
        return this.maxCoordinate.y();
    }
};

BoundingBox.prototype.south = function south(unit) {
    if (crsIsGeographic(this.crs())) {
        return this.minCoordinate.latitude(unit);
    } else {
        return this.minCoordinate.y();
    }
};

BoundingBox.prototype.top = function top() {
    if (crsIsGeographic(this.crs())) {
        return this.maxCoordinate.altitude();
    } else {
        return this.maxCoordinate.z();
    }
};

BoundingBox.prototype.bottom = function bottom() {
    if (crsIsGeographic(this.crs())) {
        return this.minCoordinate.altitude();
    } else {
        return this.minCoordinate.z();
    }
};

BoundingBox.prototype.crs = function crs() {
    return this.minCoordinate.crs;
};

BoundingBox.prototype.center = function center() {
    const c = this.minCoordinate.clone();
    const dim = this.dimensions();
    c._values[0] += dim.x * 0.5;
    c._values[1] += dim.y * 0.5;
    c._values[2] += dim.z * 0.5;
    return c;
};

BoundingBox.prototype.dimensions = function dimensions(unit) {
    return {
        x: Math.abs(this.east(unit) - this.west(unit)),
        y: Math.abs(this.north(unit) - this.south(unit)),
        z: Math.abs(this.top() - this.bottom()),
    };
};

/**
 * @documentation: Retourne True if point is inside the bounding box
 *
 * @param point {[object Object]}
 */
BoundingBox.prototype.isInside = function isInside(coord) {
    const c = (this.crs() == coord.crs) ? coord : coord.as(this.crs());

    // TODO this ignores altitude
    if (crsIsGeographic(this.crs())) {
        return c.longitude() <= this.east() &&
               c.longitude() >= this.west() &&
               c.latitude() <= this.north() &&
               c.latitude() >= this.south();
    } else {
        return c.x() <= this.east() &&
               c.x() >= this.west() &&
               c.y() <= this.north() &&
               c.y() >= this.south();
    }
};

BoundingBox.prototype.BBoxIsInside = function BBoxIsInside(bbox) {
    const unit = crsToUnit(this.crs());
    return bbox.east(unit) <= this.east() &&
           bbox.west(unit) >= this.west() &&
           bbox.north(unit) <= this.north() &&
           bbox.south(unit) >= this.south();
};

BoundingBox.prototype.offsetScale = function offsetScale(bbox) {
    if (bbox.crs() != this.crs()) {
        throw new Error('unsupported offscale between 2 diff crs');
    }

    const dimension = {
        x: Math.abs(this.east() - this.west()),
        y: Math.abs(this.north() - this.south()),
    };

    var originX = (bbox.west() - this.west()) / dimension.x;
    var originY = (bbox.north() - this.north()) / dimension.y;

    var scale = Math.abs(bbox.east() - bbox.west()) / dimension.x;
    return new THREE.Vector3(originX, originY, scale);
};

/**
 * @documentation: Set altitude of bounding box
 * @param {type} min : minimum altitude
 * @param {type} max : maximum altitude
 * @returns {undefined}
 */
BoundingBox.prototype.setBBoxZ = function setBBoxZ(min, max) {
    this.minCoordinate._values[2] = min;
    this.maxCoordinate._values[2] = max;
};

/**
 * @documentation: Return true if this bounding box intersect with the bouding box parameter
 * @param {type} bbox
 * @returns {Boolean}
 */
BoundingBox.prototype.intersect = function intersect(bbox) {
    const other = (bbox.crs() == this.crs()) ? bbox : bbox.as(this.crs());
    return !(this.west() >= other.east() ||
             this.east() <= other.west() ||
             this.south() >= other.north() ||
             this.north() <= other.south());
};

export default BoundingBox;
