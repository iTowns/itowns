import CoordCarto from 'Core/Geographic/CoordCarto';
import THREE from 'THREE';
import OBB from 'Renderer/ThreeExtented/OBB';

function BuilderEllipsoidTile(model, projector) {

    this.ellipsoid = model;
    this.projector = projector;

}

BuilderEllipsoidTile.prototype.constructor = BuilderEllipsoidTile;

// prepare params
// init projected object -> params.projected
BuilderEllipsoidTile.prototype.Prepare = function(params) {

    params.nbRow = Math.pow(2.0, params.zoom + 1.0);

    var st1 = this.projector.WGS84ToOneSubY(params.bbox.minCarto.latitude);

    if (!isFinite(st1))
        st1 = 0;

    var sizeTexture = 1.0 / params.nbRow;

    var start = (st1 % (sizeTexture));

    params.deltaUV1 = (st1 - start) * params.nbRow;

    // /!\ init params.projected
    params.projected = new CoordCarto();
};


// get center tile in cartesian 3D
BuilderEllipsoidTile.prototype.Center = function(params) {
    params.center = this.ellipsoid.cartographicToCartesian(new CoordCarto(params.bbox.center.x, params.bbox.center.y, 0));
    return params.center;
};

// get position 3D cartesian
BuilderEllipsoidTile.prototype.VertexPosition = function(params) {
    params.cartesianPosition = this.ellipsoid.cartographicToCartesian(params.projected);
    return params.cartesianPosition;
};

// get normal for last vertex
BuilderEllipsoidTile.prototype.VertexNormal = function(params) {
    return params.cartesianPosition.clone().normalize();
};

// coord u tile to projected
BuilderEllipsoidTile.prototype.uProjecte = function(u, params) {
    this.projector.UnitaryToLongitudeWGS84(u, params.projected, params.bbox);
};

// coord v tile to projected
BuilderEllipsoidTile.prototype.vProjecte = function(v, params) {
    this.projector.UnitaryToLatitudeWGS84(v, params.projected, params.bbox);
};

// Compute uv 1, if isn't defined the uv1 isn't computed
BuilderEllipsoidTile.prototype.getUV_PM = function(params) {
    var t = this.projector.WGS84ToOneSubY(params.projected.latitude) * params.nbRow;

    if (!isFinite(t))
        t = 0;

    return t - params.deltaUV1;
};

// get oriented bounding box of tile
BuilderEllipsoidTile.prototype.OBB = function(params) {

    var cardinals = [];

    var normal = params.center.clone().normalize();

    var phiStart = params.bbox.minCarto.longitude;
    var phiLength = params.bbox.dimension.x;

    var thetaStart = params.bbox.minCarto.latitude;
    var thetaLength = params.bbox.dimension.y;

    //      0---1---2
    //      |       |
    //      7       3
    //      |       |
    //      6---5---4

    cardinals.push(new CoordCarto(phiStart, thetaStart, 0));
    cardinals.push(new CoordCarto(phiStart + params.bbox.halfDimension.x, thetaStart, 0));
    cardinals.push(new CoordCarto(phiStart + phiLength, thetaStart, 0));
    cardinals.push(new CoordCarto(phiStart + phiLength, thetaStart + params.bbox.halfDimension.y, 0));
    cardinals.push(new CoordCarto(phiStart + phiLength, thetaStart + thetaLength, 0));
    cardinals.push(new CoordCarto(phiStart + params.bbox.halfDimension.x, thetaStart + thetaLength, 0));
    cardinals.push(new CoordCarto(phiStart, thetaStart + thetaLength, 0));
    cardinals.push(new CoordCarto(phiStart, thetaStart + params.bbox.halfDimension.y, 0));

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
    qRotY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -params.bbox.center.x);
    qRotY.multiply(planeZ);

    for (var i = 0; i < cardinals.length; i++) {
        cardinals3D.push(this.ellipsoid.cartographicToCartesian(cardinals[i]));
        cardin3DPlane.push(tangentPlane.projectPoint(cardinals3D[i]));
        vec.subVectors(cardinals3D[i], params.center);
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

    var translate = new THREE.Vector3(0, delta, -maxHeight);
    var obb = new OBB(min, max, normal, translate);

    return obb;
};

export default BuilderEllipsoidTile;
