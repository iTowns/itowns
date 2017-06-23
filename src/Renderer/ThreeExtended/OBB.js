import * as THREE from 'three';
import { C, UNIT } from '../../Core/Geographic/Coordinates';

function OBB(min, max, lookAt, translate) {
    THREE.Object3D.call(this);
    this.box3D = new THREE.Box3(min, max);

    this.natBox = this.box3D.clone();

    if (lookAt) {
        this.lookAt(lookAt);
    }


    if (translate) {
        this.translateX(translate.x);
        this.translateY(translate.y);
        this.translateZ(translate.z);
    }

    this.oPosition = new THREE.Vector3();

    this.update();

    this.oPosition = this.position.clone();
    this.z = { min: 0, max: 0 };
}

OBB.prototype = Object.create(THREE.Object3D.prototype);
OBB.prototype.constructor = OBB;

OBB.prototype.update = function update() {
    this.updateMatrixWorld(true);

    this.pointsWorld = this._cPointsWorld(this._points());
};

OBB.prototype.updateZ = function updateZ(min, max) {
    this.z = { min, max };
    return this.addHeight(min, max);
};

OBB.prototype.addHeight = function addHeight(minz, maxz) {
    var depth = Math.abs(this.natBox.min.z - this.natBox.max.z);
    //
    this.box3D.min.z = this.natBox.min.z + minz;
    this.box3D.max.z = this.natBox.max.z + maxz;

    // TODO à vérifier --->

    var nHalfSize = Math.abs(this.box3D.min.z - this.box3D.max.z) * 0.5;
    var translaZ = this.box3D.min.z + nHalfSize;
    this.box3D.min.z = -nHalfSize;
    this.box3D.max.z = nHalfSize;

    this.position.copy(this.oPosition);

    this.translateZ(translaZ);

    this.update();

    return new THREE.Vector2(nHalfSize - depth * 0.5, translaZ);

    // TODO <---- à vérifier
};

OBB.prototype._points = function _points() {
    var points = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
    ];

    points[0].set(this.box3D.max.x, this.box3D.max.y, this.box3D.max.z);
    points[1].set(this.box3D.min.x, this.box3D.max.y, this.box3D.max.z);
    points[2].set(this.box3D.min.x, this.box3D.min.y, this.box3D.max.z);
    points[3].set(this.box3D.max.x, this.box3D.min.y, this.box3D.max.z);
    points[4].set(this.box3D.max.x, this.box3D.max.y, this.box3D.min.z);
    points[5].set(this.box3D.min.x, this.box3D.max.y, this.box3D.min.z);
    points[6].set(this.box3D.min.x, this.box3D.min.y, this.box3D.min.z);
    points[7].set(this.box3D.max.x, this.box3D.min.y, this.box3D.min.z);

    return points;
};

OBB.prototype._cPointsWorld = function _cPointsWorld(points) {
    var m = this.matrixWorld;

    for (var i = 0, max = points.length; i < max; i++) {
        points[i].applyMatrix4(m);
    }

    return points;
};

// get oriented bounding box of tile
OBB.extentToOBB = function extentToOBB(extent, minHeight = 0, maxHeight = 0) {
    if (extent._crs != 'EPSG:4326') {
        throw new Error('The extent crs is not a Geographic Coordinates (EPSG:4326)');
    }
    const cardinals = [];
    // Calcule the center world position with the extent.
    const centerWorld = extent.center().as('EPSG:4978').xyz();
    const normal = centerWorld.clone().normalize();

    const bboxDimension = extent.dimensions(UNIT.RADIAN);
    const phiStart = extent.west(UNIT.RADIAN);
    const phiLength = bboxDimension.x;

    const thetaStart = extent.south(UNIT.RADIAN);
    const thetaLength = bboxDimension.y;
    //      0---1---2
    //      |       |
    //      7   8   3
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
    cardinals.push(extent.center());

    var cardin3DPlane = [];

    var maxV = new THREE.Vector3(-1000, -1000, -1000);
    var minV = new THREE.Vector3(1000, 1000, 1000);
    var halfMaxHeight = 0;
    var planeZ = new THREE.Quaternion();
    var qRotY = new THREE.Quaternion();
    var tangentPlaneAtOrigin = new THREE.Plane(normal);

    planeZ.setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1));
    qRotY.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), -extent.center().longitude(UNIT.RADIAN));
    qRotY.multiply(planeZ);

    for (var i = 0; i < cardinals.length; i++) {
        const cardinal3D = cardinals[i].as('EPSG:4978').xyz();
        cardin3DPlane.push(tangentPlaneAtOrigin.projectPoint(cardinal3D));
        const d = cardin3DPlane[i].distanceTo(cardinal3D.sub(centerWorld));
        halfMaxHeight = Math.max(halfMaxHeight, d * 0.5);
        // compute tile's min/max
        cardin3DPlane[i].applyQuaternion(qRotY);
        maxV.max(cardin3DPlane[i]);
        minV.min(cardin3DPlane[i]);
    }

    var halfLength = Math.abs(maxV.y - minV.y) * 0.5;
    var halfWidth = Math.abs(maxV.x - minV.x) * 0.5;
    var max = new THREE.Vector3(halfLength, halfWidth, halfMaxHeight);
    var min = new THREE.Vector3(-halfLength, -halfWidth, -halfMaxHeight);

    // delta is the distance between line `([6],[4])` and the point `[5]`
    // These points [6],[5],[4] aren't aligned because of the ellipsoid shape
    var delta = halfWidth - Math.abs(cardin3DPlane[5].x);
    var translate = new THREE.Vector3(0, delta, -halfMaxHeight);
    var obb = new OBB(min, max, normal, translate);
    // for 3D
    if (minHeight !== 0 || maxHeight !== 0) {
        obb.addHeight(minHeight, maxHeight);
    }
    obb.centerWorld = centerWorld;
    return obb;
};
export default OBB;
