import * as THREE from 'three';
import Coordinates from '../../Geographic/Coordinates';
import Projection from '../../Geographic/Projection';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Extent from '../../Geographic/Extent';

const axisZ = new THREE.Vector3(0, 0, 1);
const axisY = new THREE.Vector3(0, 1, 0);

function WGS84ToOneSubY(latitude) {
    return 1.0 - Projection.WGS84ToY(latitude);
}

function BuilderEllipsoidTile() {
    this.tmp = {
        coords: [
            new Coordinates('EPSG:4326', 0, 0),
            new Coordinates('EPSG:4326', 0, 0)],
        position: new THREE.Vector3(),
    };

    this.type = 'e';
}

BuilderEllipsoidTile.prototype.constructor = BuilderEllipsoidTile;

// prepare params
// init projected object -> params.projected

BuilderEllipsoidTile.prototype.Prepare = function Prepare(params) {
    params.nbRow = Math.pow(2.0, params.level + 1.0);

    var st1 = WGS84ToOneSubY(params.extent.south());

    if (!isFinite(st1))
        { st1 = 0; }

    var sizeTexture = 1.0 / params.nbRow;

    var start = (st1 % (sizeTexture));

    params.deltaUV1 = (st1 - start) * params.nbRow;

    // transformation to align tile's normal to z axis
    params.quatNormalToZ = new THREE.Quaternion().setFromAxisAngle(
        axisY,
        -(Math.PI * 0.5 - THREE.Math.degToRad(params.extent.center().latitude())));

    // let's avoid building too much temp objects
    params.projected = { longitude: 0, latitude: 0 };
};

// get center tile in cartesian 3D
BuilderEllipsoidTile.prototype.Center = function Center(extent) {
    return extent.center(this.tmp.coords[0])
        .as('EPSG:4978', this.tmp.coords[1]).xyz();
};

// get position 3D cartesian
BuilderEllipsoidTile.prototype.VertexPosition = function VertexPosition(params) {
    this.tmp.coords[0].set(
        'EPSG:4326',
        params.projected.longitude,
        params.projected.latitude);

    this.tmp.coords[0].as('EPSG:4978', this.tmp.coords[1]).xyz(this.tmp.position);
    return this.tmp.position;
};

// get normal for last vertex
BuilderEllipsoidTile.prototype.VertexNormal = function VertexNormal() {
    return this.tmp.coords[1].geodesicNormal;
};

// coord u tile to projected
BuilderEllipsoidTile.prototype.uProjecte = function uProjecte(u, params) {
    params.projected.longitude = Projection.UnitaryToLongitudeWGS84(u, params.extent);
};

// coord v tile to projected
BuilderEllipsoidTile.prototype.vProjecte = function vProjecte(v, params) {
    params.projected.latitude = Projection.UnitaryToLatitudeWGS84(v, params.extent);
};

// Compute uv 1, if isn't defined the uv1 isn't computed
BuilderEllipsoidTile.prototype.getUV_PM = function getUV_PM(params) {
    var t = WGS84ToOneSubY(params.projected.latitude) * params.nbRow;

    if (!isFinite(t))
        { t = 0; }

    return t - params.deltaUV1;
};

const quatToAlignLongitude = new THREE.Quaternion();
const quatToAlignLatitude = new THREE.Quaternion();

BuilderEllipsoidTile.prototype.computeSharableExtent = function fnComputeSharableExtent(extent) {
    // Compute sharable extent to pool the geometries
    // the geometry in common extent is identical to the existing input
    // with a transformation (translation, rotation)

    // TODO: It should be possible to use equatorial plan symetrie,
    // but we should be reverse UV on tile
    // Common geometry is looking for only on longitude
    const sizeLongitude = Math.abs(extent.west() - extent.east()) / 2;
    const sharableExtent = new Extent(extent.crs(), -sizeLongitude, sizeLongitude, extent.south(), extent.north());

    // compute rotation to transform tile to position it on ellipsoid
    // this transformation take into account the transformation of the parents
    const rotLon = THREE.Math.degToRad(extent.west() - sharableExtent.west());
    const rotLat = THREE.Math.degToRad(90 - extent.center().latitude());
    quatToAlignLongitude.setFromAxisAngle(axisZ, rotLon);
    quatToAlignLatitude.setFromAxisAngle(axisY, rotLat);
    quatToAlignLongitude.multiply(quatToAlignLatitude);

    return {
        sharableExtent,
        quaternion: quatToAlignLongitude.clone(),
        position: this.Center(extent),
    };
};

// use for region for adaptation boundingVolume
BuilderEllipsoidTile.prototype.OBB = function OBBFn(boundingBox) {
    return new OBB(boundingBox.min, boundingBox.max);
};

export default BuilderEllipsoidTile;
