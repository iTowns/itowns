import * as THREE from 'three';
import Coordinates, { C, UNIT } from '../../Core/Geographic/Coordinates';
import TileGeometry from '../../Core/TileGeometry';
import BuilderEllipsoidTile from '../../Core/Prefab/Globe/BuilderEllipsoidTile';

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
const builder = new BuilderEllipsoidTile();
OBB.extentToOBB = function _extentToOBB(extent, minHeight = 0, maxHeight = 0) {
    if (extent._crs != 'EPSG:4326') {
        throw new Error('The extent crs is not a Geographic Coordinates (EPSG:4326)');
    }
    if (extent._internalStorageUnit != UNIT.RADIAN) {
        throw new Error('The extent internalStorageUnit is not in radian unit');
    }

    const { sharableExtent, quaternion, position } = builder.computeSharableExtent(extent);
    const paramsGeometry = {
        extent: sharableExtent,
        level: 0,
        segment: 2,
        disableSkirt: true,
    };

    const geometry = new TileGeometry(paramsGeometry, builder);
    const obb = geometry.OBB;
    obb.updateZ(minHeight, maxHeight);
    obb.position.copy(position);
    obb.quaternion.copy(quaternion);
    obb.update();

    // Calling geometry.dispose() is not needed since this geometry never gets rendered
    return obb;
};

export default OBB;
