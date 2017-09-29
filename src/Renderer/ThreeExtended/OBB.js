import * as THREE from 'three';
import Coordinates, { C, UNIT } from '../../Core/Geographic/Coordinates';

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

// Allocate these variables once and for all
const tmp = {
    epsg4978: new Coordinates('EPSG:4978', 0, 0),
    cardinals: [],
    normal: new THREE.Vector3(),
    maxV: new THREE.Vector3(),
    minV: new THREE.Vector3(),
    translate: new THREE.Vector3(),
    cardinal3D: new THREE.Vector3(),
    planeZ: new THREE.Quaternion(),
    qRotY: new THREE.Quaternion(),
    tangentPlaneAtOrigin: new THREE.Plane(),
    zUp: new THREE.Vector3(0, 0, 1),
};

for (let i = 0; i < 9; i++) {
    tmp.cardinals.push(C.EPSG_4326_Radians(0, 0));
}

// get oriented bounding box of tile
OBB.extentToOBB = function extentToOBB(extent, minHeight = 0, maxHeight = 0) {
    if (extent._crs != 'EPSG:4326') {
        throw new Error('The extent crs is not a Geographic Coordinates (EPSG:4326)');
    }

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
    tmp.cardinals[0]._values[0] = phiStart;
    tmp.cardinals[0]._values[1] = thetaStart;
    tmp.cardinals[1]._values[0] = phiStart + bboxDimension.x * 0.5;
    tmp.cardinals[1]._values[1] = thetaStart;
    tmp.cardinals[2]._values[0] = phiStart + phiLength;
    tmp.cardinals[2]._values[1] = thetaStart;
    tmp.cardinals[3]._values[0] = phiStart + phiLength;
    tmp.cardinals[3]._values[1] = thetaStart + bboxDimension.y * 0.5;
    tmp.cardinals[4]._values[0] = phiStart + phiLength;
    tmp.cardinals[4]._values[1] = thetaStart + thetaLength;
    tmp.cardinals[5]._values[0] = phiStart + bboxDimension.x * 0.5;
    tmp.cardinals[5]._values[1] = thetaStart + thetaLength;
    tmp.cardinals[6]._values[0] = phiStart;
    tmp.cardinals[6]._values[1] = thetaStart + thetaLength;
    tmp.cardinals[7]._values[0] = phiStart;
    tmp.cardinals[7]._values[1] = thetaStart + bboxDimension.y * 0.5;
    extent.center(tmp.cardinals[8]);

    return OBB.cardinals4978ToOBB(tmp.cardinals, minHeight, maxHeight);
};

OBB.cardinals4978ToOBB = function cardinals4978ToOBB(cardinals, minHeight = 0, maxHeight = 0) {
    var cardin3DPlane = [];

    // Calcule the center world position with the extent.
    const centerWorld = cardinals[8].as('EPSG:4978', tmp.epsg4978).xyz();
    tmp.normal.copy(centerWorld).normalize();

    tmp.maxV.set(-1000, -1000, -1000);
    tmp.minV.set(1000, 1000, 1000);
    var halfMaxHeight = 0;
    tmp.tangentPlaneAtOrigin.set(tmp.normal, 0);

    tmp.planeZ.setFromUnitVectors(tmp.normal, tmp.zUp);
    tmp.qRotY.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), -tmp.cardinals[8].longitude(UNIT.RADIAN));
    tmp.qRotY.multiply(tmp.planeZ);

    for (var i = 0; i < cardinals.length; i++) {
        cardinals[i].as('EPSG:4978', tmp.epsg4978).xyz(tmp.cardinal3D);
        cardin3DPlane.push(tmp.tangentPlaneAtOrigin.projectPoint(tmp.cardinal3D));
        const d = cardin3DPlane[i].distanceTo(tmp.cardinal3D.sub(centerWorld));
        halfMaxHeight = Math.max(halfMaxHeight, d * 0.5);
        // compute tile's min/max
        cardin3DPlane[i].applyQuaternion(tmp.qRotY);
        tmp.maxV.max(cardin3DPlane[i]);
        tmp.minV.min(cardin3DPlane[i]);
    }

    var halfLength = Math.abs(tmp.maxV.y - tmp.minV.y) * 0.5;
    var halfWidth = Math.abs(tmp.maxV.x - tmp.minV.x) * 0.5;

    const max = new THREE.Vector3(halfLength, halfWidth, halfMaxHeight);
    const min = new THREE.Vector3(-halfLength, -halfWidth, -halfMaxHeight);

    // delta is the distance between line `([6],[4])` and the point `[5]`
    // These points [6],[5],[4] aren't aligned because of the ellipsoid shape
    var delta = halfWidth - Math.abs(cardin3DPlane[5].x);
    tmp.translate.set(0, delta, -halfMaxHeight);

    var obb = new OBB(min, max, tmp.normal, tmp.translate);

    // for 3D
    if (minHeight !== 0 || maxHeight !== 0) {
        obb.addHeight(minHeight, maxHeight);
    }
    return obb;
};
export default OBB;
