import * as THREE from 'three';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Coordinates from '../../Geographic/Coordinates';

function PlanarTileBuilder() {
    this.tmp = {
        coords: new Coordinates('EPSG:4326', 0, 0),
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 0, 1),
    };
}

PlanarTileBuilder.prototype.constructor = PlanarTileBuilder;

// prepare params
// init projected object -> params.projected
PlanarTileBuilder.prototype.Prepare = function Prepare(params) {
    params.nbRow = Math.pow(2.0, params.zoom + 1.0);
    params.projected = new THREE.Vector3();
};


// get center tile in cartesian 3D
PlanarTileBuilder.prototype.Center = function Center(params) {
    params.extent.center(this.tmp.coords);
    params.center = new THREE.Vector3(this.tmp.coords.x(), this.tmp.coords.y(), 0);
    return params.center;
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
PlanarTileBuilder.prototype.OBB = function _OBB(params) {
    const center = params.center;
    const max = new THREE.Vector3(
        params.extent.east(),
        params.extent.north(),
        0).sub(center);
    const min = new THREE.Vector3(
        params.extent.west(),
        params.extent.south(),
        0).sub(center);
    const translate = new THREE.Vector3(0, 0, 0);
    // normal is up vector
    return new OBB(min, max, undefined, translate);
};

export default PlanarTileBuilder;
