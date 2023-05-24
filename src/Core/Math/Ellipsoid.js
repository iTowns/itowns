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
        this.eccentricity = 0;

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

        this.eccentricity = Math.sqrt(this._radiiSquared.x - this._radiiSquared.z) / this.size.x;
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
        const cartesianArray = [];
        for (let i = 0; i < coordCartoArray.length; i++) {
            cartesianArray.push(this.cartographicToCartesian(coordCartoArray[i]));
        }

        return cartesianArray;
    }

    intersection(ray) {
        const EPSILON = 0.0001;
        const O_C = ray.origin;
        const dir = ray.direction;
        // normalizeVector( dir );

        const a =
            ((dir.x * dir.x) * this._invRadiiSquared.x) + ((dir.y * dir.y) * this._invRadiiSquared.y) + ((dir.z * dir.z) * this._invRadiiSquared.z);

        const b =
            ((2 * O_C.x * dir.x) * this._invRadiiSquared.x) + ((2 * O_C.y * dir.y) * this._invRadiiSquared.y) + ((2 * O_C.z * dir.z) * this._invRadiiSquared.z);
        const c =
            ((O_C.x * O_C.x) * this._invRadiiSquared.x) + ((O_C.y * O_C.y) * this._invRadiiSquared.y) + ((O_C.z * O_C.z) * this._invRadiiSquared.z) - 1;

        let d = ((b * b) - (4 * a * c));
        if (d < 0 || a === 0 || b === 0 || c === 0) { return false; }

        d = Math.sqrt(d);

        const t1 = (-b + d) / (2 * a);
        const t2 = (-b - d) / (2 * a);

        if (t1 <= EPSILON && t2 <= EPSILON) { return false; } // both intersections are behind the ray origin
        // var back = (t1 <= EPSILON || t2 <= EPSILON); // If only one intersection (t>0) then we are inside the ellipsoid and the intersection is at the back of the ellipsoid
        let t = 0;
        if (t1 <= EPSILON) { t = t2; } else
        if (t2 <= EPSILON) { t = t1; } else { t = (t1 < t2) ? t1 : t2; }

        if (t < EPSILON) { return false; } // Too close to intersection

        const inter = new THREE.Vector3();

        inter.addVectors(ray.origin, dir.clone().setLength(t));

        return inter;
    }

    computeDistance(coordCarto1, coordCarto2) {
        console.warn('computeDistance is renamed to geodesicDistance');
        this.geodesicDistance(coordCarto1, coordCarto2);
    }

    /**
     * Calculate the geodesic distance, between coordCarto1 and coordCarto2.
     * It's most short distance on ellipsoid surface between coordCarto1 and coordCarto2.
     * It's called orthodromy.
     *
     * @param      {Coordinates}  coordCarto1  The coordinate carto 1
     * @param      {Coordinates}  coordCarto2  The coordinate carto 2
     * @return     {number}  The orthodromic distance between the two given coordinates.
     */
    geodesicDistance(coordCarto1, coordCarto2) {
        // The formula uses the distance on approximated sphere,
        // with the nearest local radius of curvature of the ellipsoid
        // https://geodesie.ign.fr/contenu/fichiers/Distance_longitude_latitude.pdf
        const longitude1 = THREE.MathUtils.degToRad(coordCarto1.longitude);
        const latitude1 = THREE.MathUtils.degToRad(coordCarto1.latitude);
        const longitude2 = THREE.MathUtils.degToRad(coordCarto2.longitude);
        const latitude2 = THREE.MathUtils.degToRad(coordCarto2.latitude);

        const distRad = Math.acos(Math.sin(latitude1) * Math.sin(latitude2) + Math.cos(latitude1) * Math.cos(latitude2) * Math.cos(longitude2 - longitude1));

        const e = this.eccentricity;
        const latMoy = (latitude1 + latitude2) * 0.5;
        const es = (e * Math.sin(latMoy)) ** 2;
        const rho = this.size.x * (1 - e ** 2) / ((1 - es) ** (3 / 2));
        const N = this.size.x / Math.sqrt(1 - es);

        return distRad * Math.sqrt(rho * N);
    }
}

export default Ellipsoid;
