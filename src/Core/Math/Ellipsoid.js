import * as THREE from 'three';
import proj4 from 'proj4';
import Coordinates from 'Core/Geographic/Coordinates';

export const ellipsoidSizes = new THREE.Vector3(
    proj4.WGS84.a,
    proj4.WGS84.a,
    proj4.WGS84.b);

const normal = new THREE.Vector3();

class Ellipsoid {
    constructor(size = ellipsoidSizes) {
        this.size = new THREE.Vector3();
        this._radiiSquared = new THREE.Vector3();
        this._invRadiiSquared = new THREE.Vector3();

        this.setSize(size);
    }

    geodeticSurfaceNormal(cartesian, target = new THREE.Vector3()) {
        return cartesian.toVector3(target).multiply(this._invRadiiSquared).normalize();
    }

    geodeticSurfaceNormalCartographic(coordCarto, target = new THREE.Vector3()) {
        const longitude = THREE.MathUtils.degToRad(coordCarto.longitude);
        const latitude = THREE.MathUtils.degToRad(coordCarto.latitude);
        const cosLatitude = Math.cos(latitude);

        return target.set(cosLatitude * Math.cos(longitude),
            cosLatitude * Math.sin(longitude),
            Math.sin(latitude));
    }

    setSize(size) {
        this.size.set(size.x, size.y, size.z);

        this._radiiSquared.multiplyVectors(size, size);

        this._invRadiiSquared.x = (size.x == 0) ? 0 : 1 / this._radiiSquared.x;
        this._invRadiiSquared.y = (size.y == 0) ? 0 : 1 / this._radiiSquared.y;
        this._invRadiiSquared.z = (size.z == 0) ? 0 : 1 / this._radiiSquared.z;
    }

    cartographicToCartesian(coordCarto, target = new THREE.Vector3()) {
        normal.copy(coordCarto.geodesicNormal);

        target.multiplyVectors(this._radiiSquared, normal);

        const gamma = Math.sqrt(normal.dot(target));

        target.divideScalar(gamma);

        normal.multiplyScalar(coordCarto.altitude);

        return target.add(normal);
    }

    /**
     * Convert cartesian coordinates to geographic according to the current ellipsoid of revolution.
     * @param {Object} position - The coordinate to convert
     * @param {number} position.x
     * @param {number} position.y
     * @param {number} position.z
     * @param {Coordinate} [target] coordinate to copy result
     * @returns {Coordinate} an object describing the coordinates on the reference ellipsoid, angles are in degree
     */
    cartesianToCartographic(position, target = new Coordinates('EPSG:4326', 0, 0, 0)) {
        // for details, see for example http://www.linz.govt.nz/data/geodetic-system/coordinate-conversion/geodetic-datum-conversions/equations-used-datum
        // TODO the following is only valable for oblate ellipsoid of revolution. do we want to support triaxial ellipsoid?
        const R = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const a = this.size.x; // x
        const b = this.size.z; // z
        const e = Math.abs((a * a - b * b) / (a * a));
        const f = 1 - Math.sqrt(1 - e);
        const rsqXY = Math.sqrt(position.x * position.x + position.y * position.y);

        const theta = Math.atan2(position.y, position.x);
        const nu = Math.atan(position.z / rsqXY * ((1 - f) + e * a / R));

        const sinu = Math.sin(nu);
        const cosu = Math.cos(nu);

        const phi = Math.atan((position.z * (1 - f) + e * a * sinu * sinu * sinu) / ((1 - f) * (rsqXY - e * a * cosu * cosu * cosu)));

        const h = (rsqXY * Math.cos(phi)) + position.z * Math.sin(phi) - a * Math.sqrt(1 - e * Math.sin(phi) * Math.sin(phi));

        return target.setFromValues(THREE.MathUtils.radToDeg(theta), THREE.MathUtils.radToDeg(phi), h);
    }

    cartographicToCartesianArray(coordCartoArray) {
        var cartesianArray = [];
        for (var i = 0; i < coordCartoArray.length; i++) {
            cartesianArray.push(this.cartographicToCartesian(coordCartoArray[i]));
        }

        return cartesianArray;
    }

    intersection(ray) {
        var EPSILON = 0.0001;
        var O_C = ray.origin;
        var dir = ray.direction;
        // normalizeVector( dir );

        var a =
            ((dir.x * dir.x) * this._invRadiiSquared.x) + ((dir.y * dir.y) * this._invRadiiSquared.y) + ((dir.z * dir.z) * this._invRadiiSquared.z);

        var b =
            ((2 * O_C.x * dir.x) * this._invRadiiSquared.x) + ((2 * O_C.y * dir.y) * this._invRadiiSquared.y) + ((2 * O_C.z * dir.z) * this._invRadiiSquared.z);
        var c =
            ((O_C.x * O_C.x) * this._invRadiiSquared.x) + ((O_C.y * O_C.y) * this._invRadiiSquared.y) + ((O_C.z * O_C.z) * this._invRadiiSquared.z) - 1;

        var d = ((b * b) - (4 * a * c));
        if (d < 0 || a === 0 || b === 0 || c === 0) { return false; }

        d = Math.sqrt(d);

        var t1 = (-b + d) / (2 * a);
        var t2 = (-b - d) / (2 * a);

        if (t1 <= EPSILON && t2 <= EPSILON) { return false; } // both intersections are behind the ray origin
        // var back = (t1 <= EPSILON || t2 <= EPSILON); // If only one intersection (t>0) then we are inside the ellipsoid and the intersection is at the back of the ellipsoid
        var t = 0;
        if (t1 <= EPSILON) { t = t2; } else
        if (t2 <= EPSILON) { t = t1; } else { t = (t1 < t2) ? t1 : t2; }

        if (t < EPSILON) { return false; } // Too close to intersection

        var inter = new THREE.Vector3();

        inter.addVectors(ray.origin, dir.clone().setLength(t));

        return inter;
    }

    computeDistance(coordCarto1, coordCarto2) {
        var longitude1 = THREE.MathUtils.degToRad(coordCarto1.longitude);
        var latitude1 = THREE.MathUtils.degToRad(coordCarto1.latitude);
        var longitude2 = THREE.MathUtils.degToRad(coordCarto2.longitude);
        var latitude2 = THREE.MathUtils.degToRad(coordCarto2.latitude);

        var distRad = Math.acos(Math.sin(latitude1) * Math.sin(latitude2) + Math.cos(latitude1) * Math.cos(latitude2) * Math.cos(longitude2 - longitude1));

        var a = this.size.x;
        var b = this.size.z;
        var e = Math.sqrt((a * a - b * b) / (a * a));
        var latMoy = (latitude1 + latitude2) / 2;
        var rho = (a * (1 - e * e)) / Math.sqrt(1 - e * e * Math.sin(latMoy) * Math.sin(latMoy));
        var N = a / Math.sqrt(1 - e * e * Math.sin(latMoy) * Math.sin(latMoy));

        var distMeter = distRad * Math.sqrt(rho * N);
        return distMeter;
    }
}

export default Ellipsoid;
