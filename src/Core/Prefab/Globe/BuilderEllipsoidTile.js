import * as THREE from 'three';
import { C } from '../../Geographic/Coordinates';
import Projection from '../../Geographic/Projection';
import OBB from '../../../Renderer/ThreeExtended/OBB';

function BuilderEllipsoidTile() {
    this.projector = new Projection();

    this.tmp = {
        coords: [
            C.EPSG_4326_Radians(0, 0),
            C.EPSG_4326_Radians(0, 0)],
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(),
    };
}

BuilderEllipsoidTile.prototype.constructor = BuilderEllipsoidTile;

// prepare params
// init projected object -> params.projected
BuilderEllipsoidTile.prototype.Prepare = function Prepare(params) {
    params.nbRow = Math.pow(2.0, params.level + 1.0);

    var st1 = this.projector.WGS84ToOneSubY(params.extent.south());

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
    params.center = params.extent.center(this.tmp.coords[0])
        .as(params.crs, this.tmp.coords[1]).xyz();
    return params.center;
};

// get position 3D cartesian
BuilderEllipsoidTile.prototype.VertexPosition = function VertexPosition(params) {
    this.tmp.coords[0]._values[0] = params.projected.longitudeRad;
    this.tmp.coords[0]._values[1] = params.projected.latitudeRad;

    this.tmp.coords[0].as(params.crs, this.tmp.coords[1]).xyz(this.tmp.position);
    this.tmp.normal.copy(this.tmp.position).normalize();
    return this.tmp.position;
};

// get normal for last vertex
BuilderEllipsoidTile.prototype.VertexNormal = function VertexNormal() {
    return this.tmp.normal;
};

// coord u tile to projected
BuilderEllipsoidTile.prototype.uProjecte = function uProjecte(u, params) {
    params.projected.longitudeRad = this.projector.UnitaryToLongitudeWGS84(u, params.extent);
};

// coord v tile to projected
BuilderEllipsoidTile.prototype.vProjecte = function vProjecte(v, params) {
    params.projected.latitudeRad = this.projector.UnitaryToLatitudeWGS84(v, params.extent);
};

// Compute uv 1, if isn't defined the uv1 isn't computed
BuilderEllipsoidTile.prototype.getUV_PM = function getUV_PM(params) {
    var t = this.projector.WGS84ToOneSubY(params.projected.latitudeRad) * params.nbRow;

    if (!isFinite(t))
        { t = 0; }

    return t - params.deltaUV1;
};

// use for region for adaptation boundingVolume
BuilderEllipsoidTile.prototype.OBB = function OBBFn(params) {
    return OBB.extentToOBB(params.extent);
};

export default BuilderEllipsoidTile;
