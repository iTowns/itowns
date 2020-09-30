import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';

const quaternion = new THREE.Quaternion();
const center = new THREE.Vector3();

class PlanarTileBuilder {
    constructor(options = {}) {
        /* istanbul ignore next */
        if (options.projection) {
            console.warn('PlanarTileBuilder projection parameter is deprecated, use crs instead.');
            options.crs = options.crs || options.projection;
        }
        if (options.crs) {
            this.crs = options.crs;
        } else {
            throw new Error('options.crs is mandatory for PlanarTileBuilder');
        }
        this.tmp = {
            coords: new Coordinates('EPSG:4326', 0, 0),
            position: new THREE.Vector3(),
            normal: new THREE.Vector3(0, 0, 1),
        };
        this.uvCount = options.uvCount || 1;
    }
    // prepare params
    // init projected object -> params.projected
    prepare(params) {
        params.nbRow = 2 ** (params.zoom + 1.0);
        params.projected = new THREE.Vector3();
    }

    // get center tile in cartesian 3D
    center(extent) {
        extent.center(this.tmp.coords);
        center.set(this.tmp.coords.x, this.tmp.coords.y, 0);
        return center;
    }

    // get position 3D cartesian
    vertexPosition(params) {
        this.tmp.position.set(params.projected.x, params.projected.y, 0);
        return this.tmp.position;
    }

    // get normal for last vertex
    vertexNormal() {
        return this.tmp.normal;
    }

    // coord u tile to projected
    uProjecte(u, params) {
        params.projected.x = params.extent.west + u * (params.extent.east - params.extent.west);
    }

    // coord v tile to projected
    vProjecte(v, params) {
        params.projected.y = params.extent.south + v * (params.extent.north - params.extent.south);
    }

    computeSharableExtent(extent) {
        // compute sharable extent to pool the geometries
        // the geometry in common extent is identical to the existing input
        // with a translation
        const sharableExtent = new Extent(extent.crs, 0, Math.abs(extent.west - extent.east), 0, Math.abs(extent.north - extent.south));
        return {
            sharableExtent,
            quaternion,
            position: this.center(extent).clone(),
        };
    }
}

export default PlanarTileBuilder;
