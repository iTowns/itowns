/**
 * Generated On: 2015-10-5
 * Class: BoundingBox
 * Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
 */

/**
 * 
 * @param {type} defaultValue
 * @param {type} MathExt
 * @param {type} Point2D
 * @param {type} CoordCarto
 * @param {type} THREE
 * @param {type} OBB
 * @returns {BoundingBox_L10.BoundingBox}
 */
define('Scene/BoundingBox', [
    'Core/defaultValue',
    'Core/Math/MathExtented',
    'Core/Math/Point2D',
    'THREE',
    'OBB',
    'Core/Geographic/CoordCarto'
], function(defaultValue, MathExt, Point2D,THREE,OBB, CoordCarto ) {

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

        this.minCarto = new CoordCarto(defaultValue(minLongitude, 0), defaultValue(minLatitude, -MathExt.PI_OV_TWO), defaultValue(minAltitude, -10000));
        this.maxCarto = new CoordCarto(defaultValue(maxLongitude, MathExt.TWO_PI), defaultValue(maxLatitude, MathExt.PI_OV_TWO), defaultValue(maxAltitude, 10000));

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
    BoundingBox.prototype.setAltitude = function(min, max) {

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

    /**
     * @documentation:Compute the bounding box of a tile oriented ellipsoidal bounded by the bounding box
     * @param {type} ellipsoid
     * @param {type} normal
     * @param {type} center
     * @returns {BoundingBox_L7.THREE.OBB}
     */
    BoundingBox.prototype.get3DBBox = function(ellipsoid, center) {

        var cardinals = [];

        var normal = center.clone().normalize();

        var phiStart = this.minCarto.longitude;
        var phiLength = this.dimension.x;

        var thetaStart = this.minCarto.latitude;
        var thetaLength = this.dimension.y;

        //      0---1---2
        //      |       |
        //      7       3
        //      |       |
        //      6---5---4

        cardinals.push(new CoordCarto(phiStart, thetaStart, 0));
        cardinals.push(new CoordCarto(phiStart + this.halfDimension.x, thetaStart, 0));
        cardinals.push(new CoordCarto(phiStart + phiLength, thetaStart, 0));
        cardinals.push(new CoordCarto(phiStart + phiLength, thetaStart + this.halfDimension.y, 0));
        cardinals.push(new CoordCarto(phiStart + phiLength, thetaStart + thetaLength, 0));
        cardinals.push(new CoordCarto(phiStart + this.halfDimension.x, thetaStart + thetaLength, 0));
        cardinals.push(new CoordCarto(phiStart, thetaStart + thetaLength, 0));
        cardinals.push(new CoordCarto(phiStart, thetaStart + this.halfDimension.y, 0));

        var cardinals3D = [];
        var cardin3DPlane = [];

        var maxV = new THREE.Vector3(-1000, -1000, -1000);
        var minV = new THREE.Vector3(1000, 1000, 1000);
        var maxHeight = 0;
        var planeZ = new THREE.Quaternion();
        var qRotY = new THREE.Quaternion();
        var vec = new THREE.Vector3();
        var tangentPlane = new THREE.Plane(normal);

        planeZ.setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
        qRotY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -this.center.x);
        qRotY.multiply(planeZ);

        for (var i = 0; i < cardinals.length; i++) {
            cardinals3D.push(ellipsoid.cartographicToCartesian(cardinals[i]));
            cardin3DPlane.push(tangentPlane.projectPoint(cardinals3D[i]));
            vec.subVectors(cardinals3D[i], center);
            maxHeight = Math.max(maxHeight, cardin3DPlane[i].distanceTo(vec));
            cardin3DPlane[i].applyQuaternion(qRotY);
            maxV.max(cardin3DPlane[i]);
            minV.min(cardin3DPlane[i]);
        }

        maxHeight = maxHeight * 0.5;
        var width = Math.abs(maxV.z - minV.z) * 0.5;
        var height = Math.abs(maxV.x - minV.x) * 0.5;
        var delta = height - Math.abs(cardin3DPlane[5].x);
        var max = new THREE.Vector3(width, height, maxHeight);
        var min = new THREE.Vector3(-width, -height, -maxHeight);
        var obb = new THREE.OBB(min, max);

        //var l  = center.length();
        //obb.position.copy(center);                
        obb.lookAt(normal);
        obb.translateZ(-maxHeight);
        obb.translateY(delta);
        obb.update();

        return obb;

    };

    return BoundingBox;

});
