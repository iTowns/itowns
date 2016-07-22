/**
 * Generated On: 2015-10-5
 * Class: BoundingBox
 * Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
 */

import defaultValue from 'Core/defaultValue';
import MathExt from 'Core/Math/MathExtented';
import Point2D from 'Core/Math/Point2D';
import THREE from 'THREE';
import CoordCarto from 'Core/Geographic/CoordCarto';

/**
 *
 * @param {type} minLongitude : longitude minimum
 * @param {type} maxLongitude : longitude maximum
 * @param {type} minLatitude  : latitude minimum
 * @param {type} maxLatitude  : latitude maximum
 * @param {type} parentCenter : center parent
 * @param {type} minAltitude  : altitude minimum
 * @param {type} maxAltitude  : altitude maximum
 * @returns {BoundingBox_L7.BoundingBox}
 */
function BoundingBox(minLongitude, maxLongitude, minLatitude, maxLatitude, parentCenter, minAltitude, maxAltitude) {
    //Constructor

    this.minCarto = new CoordCarto(defaultValue(minLongitude, 0), defaultValue(minLatitude, -MathExt.PI_OV_TWO), defaultValue(minAltitude, 0));
    this.maxCarto = new CoordCarto(defaultValue(maxLongitude, MathExt.TWO_PI), defaultValue(maxLatitude, MathExt.PI_OV_TWO), defaultValue(maxAltitude, 0));

    this.dimension = new Point2D(Math.abs(this.maxCarto.longitude - this.minCarto.longitude), Math.abs(this.maxCarto.latitude - this.minCarto.latitude));
    this.halfDimension = new Point2D(this.dimension.x * 0.5, this.dimension.y * 0.5);
    this.center = new Point2D(this.minCarto.longitude + this.halfDimension.x, this.minCarto.latitude + this.halfDimension.y);
    //this.relativeCenter = parentCenter === undefined ? this.center : new Point2D(this.center.x - parentCenter.x,this.center.y - parentCenter.y);
    this.size = Math.sqrt(this.dimension.x * this.dimension.x + this.dimension.y * this.dimension.y);

}

/**
 * @documentation: Retourne True if point is inside the bounding box
 *
 * @param point {[object Object]}
 */
BoundingBox.prototype.isInside = function(point) {
    //TODO: Implement Me

    return point.x <= this.maxCarto.longitude && point.x >= this.minCarto.longitude && point.y <= this.maxCarto.latitude && point.y >= this.minCarto.latitude;

};

BoundingBox.prototype.BBoxIsInside = function(bbox) {
    //TODO: Implement Me

    return bbox.maxCarto.longitude <= this.maxCarto.longitude && bbox.minCarto.longitude >= this.minCarto.longitude && bbox.maxCarto.latitude <= this.maxCarto.latitude && bbox.minCarto.latitude >= this.minCarto.latitude;

};

BoundingBox.prototype.pitScale = function(bbox) {
    var pitX = Math.abs(bbox.minCarto.longitude - this.minCarto.longitude) / this.dimension.x;
    var pitY = Math.abs(bbox.maxCarto.latitude - this.maxCarto.latitude) / this.dimension.y;
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

    this.minCarto.altitude = min;
    this.maxCarto.altitude = max;

};

/**
 * @documentation: Return true if this bounding box intersect with the bouding box parameter
 * @param {type} bbox
 * @returns {Boolean}
 */
BoundingBox.prototype.intersect = function(bbox) {
    return !(this.minCarto.longitude >= bbox.maxCarto.longitude || this.maxCarto.longitude <= bbox.minCarto.longitude || this.minCarto.latitude >= bbox.maxCarto.latitude || this.maxCarto.latitude <= bbox.minCarto.latitude);

};

export default BoundingBox;
