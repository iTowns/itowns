import * as THREE from 'three';
import { C, UNIT } from '../Core/Geographic/Coordinates';
import OBB from '../Renderer/ThreeExtended/OBB';

function BuilderEllipsoidTile(projector) {
    this.projector = projector;
}

BuilderEllipsoidTile.prototype.constructor = BuilderEllipsoidTile;

// prepare params
// init projected object -> params.projected
BuilderEllipsoidTile.prototype.Prepare = function Prepare(params) {
    params.nbRow = Math.pow(2.0, params.level + 1.0);

    var st1 = this.projector.WGS84ToOneSubY(params.bbox.south());

    if (!isFinite(st1))
        { st1 = 0; }

    var sizeTexture = 1.0 / params.nbRow;

    var start = (st1 % (sizeTexture));

    params.deltaUV1 = (st1 - start) * params.nbRow;

    // let's avoid building too much temp objects
    params.projected = { longitudeRad: 0, latitudeRad: 0 };
};

// get center tile in cartesian 3D
BuilderEllipsoidTile.prototype.Center = function Center(params) {
    params.center = params.bbox.center().as('EPSG:4978').xyz();
    return params.center;
};

// get position 3D cartesian
BuilderEllipsoidTile.prototype.VertexPosition = function VertexPosition(params) {
    params.cartesianPosition = new C.EPSG_4326_Radians(
        params.projected.longitudeRad,
        params.projected.latitudeRad).as('EPSG:4978');
    return params.cartesianPosition;
};

// get normal for last vertex
BuilderEllipsoidTile.prototype.VertexNormal = function VertexNormal(params) {
    return params.cartesianPosition.xyz().normalize();
};

// coord u tile to projected
BuilderEllipsoidTile.prototype.uProjecte = function uProjecte(u, params) {
    params.projected.longitudeRad = this.projector.UnitaryToLongitudeWGS84(u, params.bbox);
};

// coord v tile to projected
BuilderEllipsoidTile.prototype.vProjecte = function vProjecte(v, params) {
    params.projected.latitudeRad = this.projector.UnitaryToLatitudeWGS84(v, params.bbox);
};

// Compute uv 1, if isn't defined the uv1 isn't computed
BuilderEllipsoidTile.prototype.getUV_PM = function getUV_PM(params) {
    var t = this.projector.WGS84ToOneSubY(params.projected.latitudeRad) * params.nbRow;

    if (!isFinite(t))
        { t = 0; }

    return t - params.deltaUV1;
};

// get oriented bounding box of tile
BuilderEllipsoidTile.prototype.OBB = function OBBFn(params) {
    var cardinals = [];

    var normal = params.center.clone().normalize();

    const bboxDimension = params.bbox.dimensions(UNIT.RADIAN);
    var phiStart = params.bbox.west();
    var phiLength = bboxDimension.x;

    var thetaStart = params.bbox.south();
    var thetaLength = bboxDimension.y;

    //      0---1---2
    //      |       |
    //      7       3
    //      |       |
    //      6---5---4

    cardinals.push(new C.EPSG_4326_Radians(phiStart, thetaStart));
    cardinals.push(new C.EPSG_4326_Radians(phiStart + bboxDimension.x * 0.5, thetaStart));
    cardinals.push(new C.EPSG_4326_Radians(phiStart + phiLength, thetaStart));
    cardinals.push(new C.EPSG_4326_Radians(phiStart + phiLength, thetaStart + bboxDimension.y * 0.5));
    cardinals.push(new C.EPSG_4326_Radians(phiStart + phiLength, thetaStart + thetaLength));
    cardinals.push(new C.EPSG_4326_Radians(phiStart + bboxDimension.x * 0.5, thetaStart + thetaLength));
    cardinals.push(new C.EPSG_4326_Radians(phiStart, thetaStart + thetaLength));
    cardinals.push(new C.EPSG_4326_Radians(phiStart, thetaStart + bboxDimension.y * 0.5));

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
    qRotY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -params.bbox.center()._values[0]);
    qRotY.multiply(planeZ);

    for (var i = 0; i < cardinals.length; i++) {
        cardinals3D.push(cardinals[i].as('EPSG:4978'));
        cardin3DPlane.push(tangentPlane.projectPoint(cardinals3D[i].xyz()));
        vec.subVectors(cardinals3D[i].xyz(), params.center);
        maxHeight = Math.max(maxHeight, cardin3DPlane[i].distanceTo(vec));
        cardin3DPlane[i].applyQuaternion(qRotY);
        maxV.max(cardin3DPlane[i]);
        minV.min(cardin3DPlane[i]);
    }

    maxHeight *= 0.5;
    var width = Math.abs(maxV.z - minV.z) * 0.5;
    var height = Math.abs(maxV.x - minV.x) * 0.5;
    var delta = height - Math.abs(cardin3DPlane[5].x);
    var max = new THREE.Vector3(width, height, maxHeight);
    var min = new THREE.Vector3(-width, -height, -maxHeight);

    var translate = new THREE.Vector3(0, delta, -maxHeight + params.center.length());
    var obb = new OBB(min, max, normal, translate);

    return obb;
};

export default BuilderEllipsoidTile;
