import * as THREE from 'three';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Coordinates from '../../Geographic/Coordinates';
import Extent from '../../Geographic/Extent';

function PlanarTileBuilder() {
    this.tmp = {
        coords: new Coordinates('EPSG:4326', 0, 0),
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 0, 1),
    };

    this.type = 'p';
}

PlanarTileBuilder.prototype.constructor = PlanarTileBuilder;

// prepare params
// init projected object -> params.projected
PlanarTileBuilder.prototype.Prepare = function Prepare(params) {
    params.nbRow = Math.pow(2.0, params.zoom + 1.0);
    params.projected = new THREE.Vector3();
};


// get center tile in cartesian 3D
const center = new THREE.Vector3();
PlanarTileBuilder.prototype.Center = function Center(extent) {
    extent.center(this.tmp.coords);
    center.set(this.tmp.coords.x(), this.tmp.coords.y(), 0);
    return center;
};

// get position 3D cartesian
PlanarTileBuilder.prototype.VertexPosition = function VertexPosition(params) {
    this.tmp.position.set(params.projected.x, params.projected.y, 0);
    return this.tmp.position;
};

// get normal for last vertex
PlanarTileBuilder.prototype.VertexNormal = function VertexNormal() {
    return this.tmp.normal;
};

// coord u tile to projected
PlanarTileBuilder.prototype.uProjecte = function uProjecte(u, params) {
    params.projected.x = params.extent.west() + u * (params.extent.east() - params.extent.west());
};

// coord v tile to projected
PlanarTileBuilder.prototype.vProjecte = function vProjecte(v, params)
{
    params.projected.y = params.extent.south() + v * (params.extent.north() - params.extent.south());
};

// get oriented bounding box of tile
PlanarTileBuilder.prototype.OBB = function OBBFn(boundingBox) {
    return new OBB(boundingBox.min, boundingBox.max);
};

const quaternion = new THREE.Quaternion();
PlanarTileBuilder.prototype.computeSharableExtent = function fnComputeSharableExtent(extent) {
    // compute sharable extent to pool the geometries
    // the geometry in common extent is identical to the existing input
    // with a translation
    const sharableExtent = new Extent(extent.crs(), 0, Math.abs(extent.west() - extent.east()), 0, Math.abs(extent.north() - extent.south()));
    sharableExtent._internalStorageUnit = extent._internalStorageUnit;
    return {
        sharableExtent,
        quaternion,
        position: this.Center(extent).clone(),
    };
};

export default PlanarTileBuilder;
