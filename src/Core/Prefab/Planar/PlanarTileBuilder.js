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
    params.projected = new Coordinates(params.extent.crs(), 0, 0, 0);
};


// get center tile in cartesian 3D
PlanarTileBuilder.prototype.Center = function Center(params) {
    params.extent.center(this.tmp.coords);
    if (params.extent.crs() !== params.crs) {
        this.tmp.coords = this.tmp.coords.as(params.crs);
    }
    params.center = this.tmp.coords.xyz();
    return params.center;
};

// get position 3D cartesian
PlanarTileBuilder.prototype.VertexPosition = function VertexPosition(params) {
    if (params.extent.crs() !== params.crs) {
        return params.projected.as(params.crs).xyz();
    } else {
        return params.projected.xyz();
    }
};

// get normal for last vertex
PlanarTileBuilder.prototype.VertexNormal = function VertexNormal() {
    return this.tmp.normal;
};

// coord u tile to projected
PlanarTileBuilder.prototype.uProjecte = function uProjecte(u, params) {
    params.projected._values[2] = 100;
    params.projected._values[0] = params.extent.west() + u * (params.extent.east() - params.extent.west());
};

// coord v tile to projected
PlanarTileBuilder.prototype.vProjecte = function vProjecte(v, params)
{
    params.projected._values[1] = params.extent.south() + v * (params.extent.north() - params.extent.south());
};

// get oriented bounding box of tile
PlanarTileBuilder.prototype.OBB = function _OBB(params) {
    if (params.crs == 'EPSG:4978') {
        const c = params.extent.center();
        const cardinals = [
            new Coordinates(params.extent.crs(), params.extent.west(), params.extent.north()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), c.x(), params.extent.north()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), params.extent.east(), params.extent.north()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), params.extent.east(), c.y()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), params.extent.east(), params.extent.south()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), c.x(), params.extent.south()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), params.extent.west(), params.extent.south()).as('EPSG:4978'),
            new Coordinates(params.extent.crs(), params.extent.west(), c.y()).as('EPSG:4978'),
            c.as('EPSG:4978')];
        return OBB.cardinals4978ToOBB(cardinals);
    }
    // FIXME
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
