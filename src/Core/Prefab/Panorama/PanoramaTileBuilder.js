import * as THREE from 'three';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Coordinates, { UNIT } from '../../Geographic/Coordinates';
import ProjectionType from './Constants';
import Extent from '../../Geographic/Extent';

function PanoramaTileBuilder(type, ratio) {
    this.tmp = {
        coords: new Coordinates('EPSG:4326', 0, 0),
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 0, 1),
    };

    if (type === undefined) {
        throw new Error('Projection type must be defined');
    }
    if (type === ProjectionType.SPHERICAL) {
        this.type = 's';
        this.radius = 100;
    } else if (type === ProjectionType.CYLINDRICAL) {
        if (!ratio) {
            throw new Error('Image ratio must be defined when using cylindrical projection');
        }
        this.type = 'c';
        this.height = 200;
        this.radius = (ratio * this.height) / (2 * Math.PI);
    } else {
        throw new Error(`Unsupported panorama projection type ${type}`);
    }
    this.projectionType = type;
}

PanoramaTileBuilder.prototype.constructor = PanoramaTileBuilder;

// prepare params
// init projected object -> params.projected
const axisX = new THREE.Vector3(0, 1, 0);
PanoramaTileBuilder.prototype.Prepare = function Prepare(params) {
    const angle = (params.extent.north(UNIT.RADIAN) + params.extent.south(UNIT.RADIAN)) * 0.5;

    if (this.projectionType === ProjectionType.SPHERICAL) {
        params.quatNormalToZ = new THREE.Quaternion().setFromAxisAngle(axisX, (Math.PI * 0.5 - angle));
        params.projected = {
            theta: 0,
            phi: 0,
            radius: this.radius,
        };
    } else {
        params.quatNormalToZ = new THREE.Quaternion().setFromAxisAngle(axisX, (Math.PI * 0.5));
        params.projected = {
            theta: 0,
            radius: this.radius,
            y: 0,
        };
    }
};

PanoramaTileBuilder.prototype.Center = function Center(extent) {
    const params = { extent };
    this.Prepare(params);
    this.uProjecte(0.5, params);
    this.vProjecte(0.5, params);

    return this.VertexPosition(params).clone();
};

// get position 3D cartesian
PanoramaTileBuilder.prototype.VertexPosition = function VertexPosition(params) {
    if (this.projectionType === ProjectionType.SPHERICAL) {
        this.tmp.position.setFromSpherical(params.projected);
    } else {
        this.tmp.position.setFromCylindrical(params.projected);
    }

    this.tmp.position.set(this.tmp.position.z, this.tmp.position.x, this.tmp.position.y);

    return this.tmp.position;
};

// get normal for last vertex
PanoramaTileBuilder.prototype.VertexNormal = function VertexNormal() {
    return this.tmp.position.clone().negate().normalize();
};

// coord u tile to projected
PanoramaTileBuilder.prototype.uProjecte = function uProjecte(u, params) {
    // both (theta, phi) and (y, z) are swapped in setFromSpherical
    params.projected.theta = Math.PI * 0.5 - THREE.Math.lerp(
        params.extent.east(UNIT.RADIAN),
        params.extent.west(UNIT.RADIAN),
        1 - u);
};

// coord v tile to projected
PanoramaTileBuilder.prototype.vProjecte = function vProjecte(v, params) {
    if (this.projectionType === ProjectionType.SPHERICAL) {
        params.projected.phi = Math.PI * 0.5 -
            THREE.Math.lerp(
                params.extent.north(UNIT.RADIAN),
                params.extent.south(UNIT.RADIAN),
                1 - v);
    } else {
        params.projected.y =
            this.height *
            THREE.Math.lerp(params.extent.south(), params.extent.north(), v) / 180;
    }
};

// get oriented bounding box of tile
PanoramaTileBuilder.prototype.OBB = function _OBB(boundingBox) {
    return new OBB(boundingBox.min, boundingBox.max);
};

const axisY = new THREE.Vector3(0, 1, 0);
const axisZ = new THREE.Vector3(0, 0, 1);
const quatToAlignLongitude = new THREE.Quaternion();
const quatToAlignLatitude = new THREE.Quaternion();

PanoramaTileBuilder.prototype.computeSharableExtent = function fnComputeSharableExtent(extent) {
    // Compute sharable extent to pool the geometries
    // the geometry in common extent is identical to the existing input
    // with a transformation (translation, rotation)
    const sizeLongitude = Math.abs(extent.west() - extent.east()) / 2;
    const sharableExtent = new Extent(extent.crs(), -sizeLongitude, sizeLongitude, extent.south(), extent.north());
    sharableExtent._internalStorageUnit = extent._internalStorageUnit;

    // compute rotation to transform tile to position it
    // this transformation take into account the transformation of the parents
    const rotLon = extent.west(UNIT.RADIAN) - sharableExtent.west(UNIT.RADIAN);
    const rotLat = Math.PI * 0.5 -
        (this.projectionType === ProjectionType.CYLINDRICAL ?
            0 :
            (extent.north(UNIT.RADIAN) + extent.south(UNIT.RADIAN)) * 0.5);
    quatToAlignLongitude.setFromAxisAngle(axisZ, -rotLon);
    quatToAlignLatitude.setFromAxisAngle(axisY, -rotLat);
    quatToAlignLongitude.multiply(quatToAlignLatitude);

    return {
        sharableExtent,
        quaternion: quatToAlignLongitude.clone(),
        position: this.Center(extent),
    };
};

export default PanoramaTileBuilder;
