/**
 * Generated On: 2015-10-5
 * Class: BoundingBox
 * Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
 */

import defaultValue from 'Core/defaultValue';
import mE from 'Core/Math/MathExtented';
import Point2D from 'Core/Math/Point2D';
import * as THREE from 'THREE';
import GeoCoordinate from 'Core/Geographic/GeoCoordinate';

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

function BoundingBox(west, east, south, north, minAltitude, maxAltitude, unit) {
    //Constructor

    this.minCoordinate = new GeoCoordinate(defaultValue(west, -mE.PI), defaultValue(south, -mE.PI_OV_TWO), defaultValue(minAltitude, 0),unit);
    this.maxCoordinate = new GeoCoordinate(defaultValue(east, mE.PI), defaultValue(north, mE.PI_OV_TWO), defaultValue(maxAltitude, 0),unit);

    this.dimension = new Point2D(Math.abs(this.east() - this.west()), Math.abs(this.north() - this.south()));
    this.halfDimension = new Point2D(this.dimension.x * 0.5, this.dimension.y * 0.5);
    this.center = new Point2D(this.west() + this.halfDimension.x, this.south() + this.halfDimension.y);
    this.size = Math.sqrt(this.dimension.x * this.dimension.x + this.dimension.y * this.dimension.y);

}

BoundingBox.prototype.west = function(unit) {
    return this.minCoordinate.longitude(unit);
};

BoundingBox.prototype.east = function(unit) {
    return this.maxCoordinate.longitude(unit);
};

BoundingBox.prototype.north = function(unit) {
    return this.maxCoordinate.latitude(unit);
};

BoundingBox.prototype.south = function(unit) {
    return this.minCoordinate.latitude(unit);
};

BoundingBox.prototype.top = function() {
    return this.maxCoordinate.altitude();
};

BoundingBox.prototype.bottom = function() {
    return this.minCoordinate.altitude();
};

/**
 * @documentation: Retourne True if point is inside the bounding box
 *
 * @param point {[object Object]}
 */
BoundingBox.prototype.isInside = function(point) {
    return point.x <= this.east() && point.x >= this.west() && point.y <= this.north() && point.y >= this.south();
};

BoundingBox.prototype.BBoxIsInside = function(bbox) {
    return bbox.east() <= this.east() && bbox.west() >= this.west() && bbox.north() <= this.north() && bbox.south() >= this.south();
};

BoundingBox.prototype.pitScale = function(bbox) {
    var pitX = Math.abs(bbox.west() - this.west()) / this.dimension.x;
    var pitY = Math.abs(bbox.north() - this.north()) / this.dimension.y;
    var scale = bbox.dimension.x / this.dimension.x;
    return new THREE.Vector3(pitX, pitY, scale);
};

/**
 * @documentation: Set the bounding box with the center of the box and the half dimension of the box
 * @param {type} center : center of the box
 * @param {type} halfDimension : half dimension of box
 * @returns {undefined}
 */
BoundingBox.prototype.set = function(center, halfDimension) {

    this.halfDimension = halfDimension;
    this.center = center;

};

/**
 * @documentation: Set altitude of bounding box
 * @param {type} min : minimum altitude
 * @param {type} max : maximum altitude
 * @returns {undefined}
 */
BoundingBox.prototype.setBBoxZ = function(min, max) {

    this.minCoordinate.setAltitude(min);
    this.maxCoordinate.setAltitude(max);

};

/**
 * @documentation: Return true if this bounding box intersect with the bouding box parameter
 * @param {type} bbox
 * @returns {Boolean}
 */
BoundingBox.prototype.intersect = function(bbox) {
    return !(this.west() >= bbox.east() || this.east() <= bbox.west() || this.south() >= bbox.north() || this.north() <= bbox.south());

};

export default BoundingBox;
