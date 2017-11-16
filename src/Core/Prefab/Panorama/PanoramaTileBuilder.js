import * as THREE from 'three';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Coordinates, { UNIT } from '../../Geographic/Coordinates';

function PanoramaTileBuilder(ratio) {
    this.tmp = {
        coords: new Coordinates('EPSG:4326', 0, 0),
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 0, 1),
    };

    if (!ratio) {
        throw new Error('ratio must be defined');
    }
    if (ratio === 2) {
        this.equirectangular = true;
        this.radius = 100;
    } else {
        this.equirectangular = false; // cylindrical proj
        this.height = 200;
        this.radius = (ratio * this.height) / (2 * Math.PI);
    }
}

PanoramaTileBuilder.prototype.constructor = PanoramaTileBuilder;

// prepare params
// init projected object -> params.projected
PanoramaTileBuilder.prototype.Prepare = function Prepare(params) {
    if (this.equirectangular) {
        params.projected = {
            theta: 0,
            phi: 0,
            radius: this.radius,
        };
    } else {
        params.projected = {
            theta: 0,
            radius: this.radius,
            y: 0,
        };
    }
};

PanoramaTileBuilder.prototype.Center = function Center(params) {
    this.Prepare(params);

    this.uProjecte(0.5, params);
    this.vProjecte(0.5, params);

    params.center = this.VertexPosition(params).clone();

    return params.center;
};

// get position 3D cartesian
PanoramaTileBuilder.prototype.VertexPosition = function VertexPosition(params) {
    if (this.equirectangular) {
        this.tmp.position.setFromSpherical(params.projected);
    } else {
        this.tmp.position.setFromCylindrical(params.projected);
    }
    const swap = this.tmp.position.y;
    this.tmp.position.y = this.tmp.position.z;
    this.tmp.position.z = this.equirectangular ? -swap : swap;

    return this.tmp.position;
};

// get normal for last vertex
PanoramaTileBuilder.prototype.VertexNormal = function VertexNormal() {
    return this.tmp.position.clone().negate().normalize();
};

// coord u tile to projected
PanoramaTileBuilder.prototype.uProjecte = function uProjecte(u, params) {
    // both (theta, phi) and (y, z) are swapped in setFromSpherical
    params.projected.theta = THREE.Math.lerp(
        params.extent.west(UNIT.RADIAN),
        params.extent.east(UNIT.RADIAN),
        u);
};

// coord v tile to projected
PanoramaTileBuilder.prototype.vProjecte = function vProjecte(v, params) {
    if (this.equirectangular) {
        params.projected.phi = Math.PI * 0.5 +
            THREE.Math.lerp(
                params.extent.south(UNIT.RADIAN),
                params.extent.north(UNIT.RADIAN),
                v);
    } else {
        params.projected.y =
            this.height *
            THREE.Math.lerp(params.extent.south(), params.extent.north(), v) / 180;
    }
};

// get oriented bounding box of tile
PanoramaTileBuilder.prototype.OBB = function _OBB(params) {
    if (this.equirectangular) {
        const pts = [];
        //      0---1---2
        //      |       |
        //      7   8   3
        //      |       |
        //      6---5---4
        const uvs = [
            [0, 0.0], [0.5, 0], [1, 0.0],
            [1, 0.5], [1, 1.0], [0.5, 1],
            [0, 1.0], [0, 0.5], [0.5, 0.5]];
        for (const uv of uvs) {
            this.uProjecte(uv[0], params);
            this.vProjecte(uv[1], params);
            pts.push(this.VertexPosition(params).clone());
        }
        return OBB.cardinalsXYZToOBB(pts, params.extent.center().longitude(UNIT.RADIAN), false);
    } else {
        // 3 points: corners + center
        const pts = [];
        this.uProjecte(0.5, params);
        this.vProjecte(0.5, params);
        pts.push(this.VertexPosition(params).clone());
        this.uProjecte(0, params);
        this.vProjecte(0, params);
        pts.push(this.VertexPosition(params).clone());
        this.uProjecte(1, params);
        this.vProjecte(1, params);
        pts.push(this.VertexPosition(params).clone());

        const direction = params.center.clone();
        direction.z = 0;
        direction.normalize();

        const diffExtent = new THREE.Vector3().subVectors(pts[2], pts[1]);
        const height = diffExtent.z;
        diffExtent.z = 0;

        const length = diffExtent.length();

        const diff = new THREE.Vector3().subVectors(params.center, pts[1]);
        diff.z = 0;
        const thickness = diff.dot(direction);

        const min = new THREE.Vector3(-length * 0.5, -height * 0.5, -thickness * 0.5);
        const max = new THREE.Vector3(length * 0.5, height * 0.5, thickness * 0.5);

        const translate = new THREE.Vector3(0, 0, thickness * -0.5);
        return new OBB(min, max, direction, translate);
    }
};

export default PanoramaTileBuilder;
