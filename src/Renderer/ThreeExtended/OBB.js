import * as THREE from 'three';
import Coordinates, { C, UNIT } from '../../Core/Geographic/Coordinates';

function OBB(min, max) {
    THREE.Object3D.call(this);
    this.box3D = new THREE.Box3(min.clone(), max.clone());
    this.natBox = this.box3D.clone();
    this.z = { min: 0, max: 0 };
    this.topPointsWorld = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
    ];
    this.update();
}

OBB.prototype = Object.create(THREE.Object3D.prototype);
OBB.prototype.constructor = OBB;

OBB.prototype.clone = function clone() {
    const cOBB = new OBB(this.natBox.min, this.natBox.max);
    cOBB.position.copy(this.position);
    cOBB.quaternion.copy(this.quaternion);
    return cOBB;
};

OBB.prototype.update = function update() {
    this.updateMatrixWorld(true);
    this._cPointsWorld(this._points(this.topPointsWorld));
};

OBB.prototype.updateZ = function updateZ(min, max) {
    this.z = { min, max };
    this.box3D.min.z = this.natBox.min.z + min;
    this.box3D.max.z = this.natBox.max.z + max;
    this.update();
};

OBB.prototype._points = function _points(points) {
    // top points of bounding box
    points[0].set(this.box3D.max.x, this.box3D.max.y, this.box3D.max.z);
    points[1].set(this.box3D.min.x, this.box3D.max.y, this.box3D.max.z);
    points[2].set(this.box3D.min.x, this.box3D.min.y, this.box3D.max.z);
    points[3].set(this.box3D.max.x, this.box3D.min.y, this.box3D.max.z);
    // bottom points of bounding box
    if (points.length > 4) {
        points[4].set(this.box3D.max.x, this.box3D.max.y, this.box3D.min.z);
        points[5].set(this.box3D.min.x, this.box3D.max.y, this.box3D.min.z);
        points[6].set(this.box3D.min.x, this.box3D.min.y, this.box3D.min.z);
        points[7].set(this.box3D.max.x, this.box3D.min.y, this.box3D.min.z);
    }

    return points;
};

OBB.prototype._cPointsWorld = function _cPointsWorld(points) {
    var m = this.matrixWorld;

    for (var i = 0, max = points.length; i < max; i++) {
        points[i].applyMatrix4(m);
    }

    return points;
};

/**
 * Determines if the sphere is above the XY space of the box
 *
 * @param      {Sphere}   sphere  The sphere
 * @return     {boolean}  True if sphere is above the XY space of the box, False otherwise.
 */
OBB.prototype.isSphereAboveXYBox = function isSphereAboveXYBox(sphere) {
    const localSpherePosition = this.worldToLocal(sphere.position);
    // get obb closest point to sphere center by clamping
    const x = Math.max(this.box3D.min.x, Math.min(localSpherePosition.x, this.box3D.max.x));
    const y = Math.max(this.box3D.min.y, Math.min(localSpherePosition.y, this.box3D.max.y));

    // this is the same as isPointInsideSphere.position
    const distance = Math.sqrt((x - localSpherePosition.x) * (x - localSpherePosition.x) +
                           (y - localSpherePosition.y) * (y - localSpherePosition.y));

    return distance < sphere.radius;
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
    transformNormalToZ: new THREE.Quaternion(),
    alignTileOnWorldXY: new THREE.Quaternion(),
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

    // Calcule the center world position with the extent.
    extent.center(tmp.cardinals[8]);

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
    // tmp.cardinals[0]._values[0] = phiStart;
    // tmp.cardinals[0]._values[1] = thetaStart;
    // tmp.cardinals[0]._normal = undefined;

    tmp.cardinals[0].set('EPSG:4326', phiStart, thetaStart, 0);
    tmp.cardinals[0]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[1].set('EPSG:4326', phiStart + bboxDimension.x * 0.5, thetaStart, 0);
    tmp.cardinals[1]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[2].set('EPSG:4326', phiStart + phiLength, thetaStart, 0);
    tmp.cardinals[2]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[3].set('EPSG:4326', phiStart + phiLength, thetaStart + bboxDimension.y * 0.5, 0);
    tmp.cardinals[3]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[4].set('EPSG:4326', phiStart + phiLength, thetaStart + thetaLength, 0);
    tmp.cardinals[4]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[5].set('EPSG:4326', phiStart + bboxDimension.x * 0.5, thetaStart + thetaLength, 0);
    tmp.cardinals[5]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[6].set('EPSG:4326', phiStart, thetaStart + thetaLength, 0);
    tmp.cardinals[6]._internalStorageUnit = UNIT.RADIAN;
    tmp.cardinals[7].set('EPSG:4326', phiStart, thetaStart + bboxDimension.y * 0.5, 0);
    tmp.cardinals[7]._internalStorageUnit = UNIT.RADIAN;

    const cardinalsXYZ = [];
    const centersLongitude = tmp.cardinals[8].longitude(UNIT.RADIAN);
    for (const cardinal of tmp.cardinals) {
        cardinalsXYZ.push(cardinal.as('EPSG:4978').xyz());
    }

    return this.cardinalsXYZToOBB(cardinalsXYZ, centersLongitude, true, tmp.cardinals[8].geodesicNormal, minHeight, maxHeight);
};

/**
 * Computes the OBB of a portion of a ellipsoid.
 * @param {Vector3[]} cardinals - 8 cardinals of the portion + the center.
 * @param {number} centerLongitude - the longitude at the center of the portion
 * @param {boolean} isEllipsoid - should be true when computing for the globe, false otherwise
 * @param {Vector3} geodesicNormal - geodesic normal at extent's center
 * @param {number} minHeight
 * @param {number} maxHeight
 * @return {OBB}
 */
OBB.cardinalsXYZToOBB = function cardinalsXYZToOBB(cardinals, centerLongitude, isEllipsoid, geodesicNormal, minHeight = 0, maxHeight = 0) {
    tmp.maxV.set(-1000, -1000, -1000);
    tmp.minV.set(1000, 1000, 1000);

    let halfMaxHeight = 0;
    tmp.normal.copy(geodesicNormal);
    tmp.tangentPlaneAtOrigin.set(tmp.normal, 0);

    // Compute the rotation transforming the tile so that it's normal becomes (0, 0, 1)
    tmp.transformNormalToZ.setFromUnitVectors(tmp.normal, tmp.zUp);
    // Compute the rotation to get the line [1,8,5] aligned on (0, 1, 0)
    tmp.alignTileOnWorldXY.setFromAxisAngle(tmp.zUp, -centerLongitude);
    const rotateTile = tmp.alignTileOnWorldXY.multiply(tmp.transformNormalToZ);

    let point5InPlaneX;
    for (let i = 0; i < cardinals.length; i++) {
        const vec = tmp.tangentPlaneAtOrigin.projectPoint(cardinals[i], tmp.cardinal3D);
        const d = vec.distanceTo(cardinals[i].sub(cardinals[8]));
        halfMaxHeight = Math.max(halfMaxHeight, d * 0.5);
        vec.applyQuaternion(rotateTile);
        // compute tile's min/max
        tmp.maxV.max(vec);
        tmp.minV.min(vec);

        if (i == 5) {
            point5InPlaneX = vec.x;
        }
    }

    const halfLength = Math.abs(tmp.maxV.y - tmp.minV.y) * 0.5;
    const halfWidth = Math.abs(tmp.maxV.x - tmp.minV.x) * 0.5;

    const nHalfSize = Math.abs(-halfMaxHeight + (minHeight - maxHeight) * 0.5);

    const max = new THREE.Vector3(halfLength, halfWidth, nHalfSize);
    const min = new THREE.Vector3(-halfLength, -halfWidth, -nHalfSize);

    // delta is the distance between line `([6],[4])` and the point `[5]`
    // These points [6],[5],[4] aren't aligned because of the ellipsoid shape
    const delta = isEllipsoid ? (halfWidth - Math.abs(point5InPlaneX)) : 0;
    tmp.translate.set(0, delta, -halfMaxHeight);

    const obb = new OBB(min, max);

    obb.lookAt(tmp.normal);
    obb.translateX(tmp.translate.x);
    obb.translateY(tmp.translate.y);
    obb.translateZ(tmp.translate.z);

    // for 3D
    if (minHeight !== 0 || maxHeight !== 0) {
        obb.translateZ(-halfMaxHeight + minHeight + nHalfSize);
    }

    return obb;
};
export default OBB;
