import * as THREE from 'three';
import OBB from 'Renderer/ThreeExtended/OBB';

function PlanarTileBuilder() {

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
    params.center = new THREE.Vector3(params.bbox.center.x, params.bbox.center.y, 0);
    return params.center;
};

// get position 3D cartesian
PlanarTileBuilder.prototype.VertexPosition = function VertexPosition(params) {
    return params.projected;
};

// get normal for last vertex
PlanarTileBuilder.prototype.VertexNormal = function VertexNormal(/* params */) {
    return new THREE.Vector3(0.0, 0.0, 1.0);
};

// coord u tile to projected
PlanarTileBuilder.prototype.uProjecte = function uProjecte(u, params) {
    params.projected.x = params.bbox.minCoordinate.longitude() + u * (params.bbox.maxCoordinate.longitude() - params.bbox.minCoordinate.longitude());
};

// coord v tile to projected
PlanarTileBuilder.prototype.vProjecte = function vProjecte(v, params)
{
    params.projected.y = params.bbox.minCoordinate.latitude() + v * (params.bbox.maxCoordinate.latitude() - params.bbox.minCoordinate.latitude());
};

// get oriented bounding box of tile
PlanarTileBuilder.prototype.OBB = function _OBB(params) {
    const max = new THREE.Vector3(params.bbox.maxCoordinate.longitude(), params.bbox.maxCoordinate.latitude(), 0);
    const min = new THREE.Vector3(params.bbox.minCoordinate.longitude(), params.bbox.minCoordinate.latitude(), 0);
    const translate = new THREE.Vector3(0, 0, 0);
    const normal = new THREE.Vector3(0, 0, 1);

    return new OBB(min, max, normal, translate);
};

export default PlanarTileBuilder;
