import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';

const PI_OV_FOUR = Math.PI / 4;
const INV_TWO_PI = 1.0 / (Math.PI * 2);
const axisZ = new THREE.Vector3(0, 0, 1);
const axisY = new THREE.Vector3(0, 1, 0);
const quatToAlignLongitude = new THREE.Quaternion();
const quatToAlignLatitude = new THREE.Quaternion();
const quatNormalToZ = new THREE.Quaternion();

function WGS84ToOneSubY(latitude) {
    return 1.0 - (0.5 - Math.log(Math.tan(PI_OV_FOUR + THREE.MathUtils.degToRad(latitude) * 0.5)) * INV_TWO_PI);
}

class BuilderEllipsoidTile {
    constructor(options = {}) {
        this.tmp = {
            coords: [
                new Coordinates('EPSG:4326', 0, 0),
                new Coordinates('EPSG:4326', 0, 0)],
            position: new THREE.Vector3(),
            dimension: new THREE.Vector2(),
        };

        this.crs = options.crs;
        // Order crs projection on tiles
        this.uvCount = options.uvCount;

        this.computeUvs = [
            // Normalized coordinates (from degree) on the entire tile
            // EPSG:4326
            () => {},
            // Float row coordinate from Pseudo mercator coordinates
            // EPSG:3857
            (params) => {
                const t = WGS84ToOneSubY(params.projected.latitude) * params.nbRow;
                return (!isFinite(t) ? 0 : t) - params.deltaUV1;
            },
        ];
    }
    // prepare params
    // init projected object -> params.projected
    prepare(params) {
        params.nbRow = 2 ** (params.level + 1.0);

        var st1 = WGS84ToOneSubY(params.extent.south);

        if (!isFinite(st1)) { st1 = 0; }

        var sizeTexture = 1.0 / params.nbRow;

        var start = (st1 % (sizeTexture));

        params.deltaUV1 = (st1 - start) * params.nbRow;

        // transformation to align tile's normal to z axis
        params.quatNormalToZ = quatNormalToZ.setFromAxisAngle(
            axisY,
            -(Math.PI * 0.5 - THREE.MathUtils.degToRad(params.extent.center().latitude)));

        // let's avoid building too much temp objects
        params.projected = { longitude: 0, latitude: 0 };
        params.extent.dimensions(this.tmp.dimension);
    }

    // get center tile in cartesian 3D
    center(extent) {
        return extent.center(this.tmp.coords[0])
            .as(this.crs, this.tmp.coords[1]).toVector3();
    }

    // get position 3D cartesian
    vertexPosition(params) {
        this.tmp.coords[0].setFromValues(
            params.projected.longitude,
            params.projected.latitude);

        this.tmp.coords[0].as(this.crs, this.tmp.coords[1]).toVector3(this.tmp.position);
        return this.tmp.position;
    }

    // get normal for last vertex
    vertexNormal() {
        return this.tmp.coords[1].geodesicNormal;
    }

    // coord u tile to projected
    uProjecte(u, params) {
        params.projected.longitude = params.extent.west + u * this.tmp.dimension.x;
    }

    // coord v tile to projected
    vProjecte(v, params) {
        params.projected.latitude = params.extent.south + v * this.tmp.dimension.y;
    }

    computeSharableExtent(extent) {
        // Compute sharable extent to pool the geometries
        // the geometry in common extent is identical to the existing input
        // with a transformation (translation, rotation)

        // TODO: It should be possible to use equatorial plan symetrie,
        // but we should be reverse UV on tile
        // Common geometry is looking for only on longitude
        const sizeLongitude = Math.abs(extent.west - extent.east) / 2;
        const sharableExtent = new Extent(extent.crs, -sizeLongitude, sizeLongitude, extent.south, extent.north);

        // compute rotation to transform tile to position it on ellipsoid
        // this transformation take into account the transformation of the parents
        const rotLon = THREE.MathUtils.degToRad(extent.west - sharableExtent.west);
        const rotLat = THREE.MathUtils.degToRad(90 - extent.center(this.tmp.coords[0]).latitude);
        quatToAlignLongitude.setFromAxisAngle(axisZ, rotLon);
        quatToAlignLatitude.setFromAxisAngle(axisY, rotLat);
        quatToAlignLongitude.multiply(quatToAlignLatitude);

        return {
            sharableExtent,
            quaternion: quatToAlignLongitude.clone(),
            position: this.center(extent),
        };
    }
}

export default BuilderEllipsoidTile;
