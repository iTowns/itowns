/**
 * Generated On: 2015-10-5
 * Class: Ellipsoid
 * Description: Classe mathématique de  l'ellispoide
 */


import * as THREE from 'three';
import { UNIT } from '../Geographic/Coordinates';

function Ellipsoid(size) {
    // Constructor


    this.rayon_1 = size.x;
    this.rayon_2 = size.y;
    this.rayon_3 = size.z;

    this.size = new THREE.Vector3(size.x, size.y, size.z);

    this._radiiSquared = new THREE.Vector3(size.x * size.x, size.y * size.y, size.z * size.z);
}

Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function geodeticSurfaceNormalCartographic(coordCarto, result) {
    var longitude = coordCarto.longitude(UNIT.RADIAN);
    var latitude = coordCarto.latitude(UNIT.RADIAN);
    var cosLatitude = Math.cos(latitude);

    var x = cosLatitude * Math.cos(longitude);
    var y = cosLatitude * Math.sin(longitude);
    var z = Math.sin(latitude);

    result = result || THREE.Vector3();
    result.set(x, y, z);

    return result.normalize();
};

Ellipsoid.prototype.setSize = function setSize(size) {
    this.rayon_1 = size.x;
    this.rayon_2 = size.y;
    this.rayon_3 = size.z;

    this._radiiSquared = new THREE.Vector3(size.x * size.x, size.y * size.y, size.z * size.z);
};


Ellipsoid.prototype.cartographicToCartesian = function cartographicToCartesian(coordCarto, normal) {
    // var n;
    var k = new THREE.Vector3();
    var n = this.geodeticSurfaceNormalCartographic(coordCarto, normal);

    k.multiplyVectors(this._radiiSquared, n);

    var gamma = Math.sqrt(n.dot(k));

    k.divideScalar(gamma);

    n.multiplyScalar(coordCarto.altitude());

    // n.multiplyScalar(0.0);

    return k.add(n);
};

/**
 * @typedef {Object} EllipsoidCoordinate
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} h - height
 */
/**
 * Convert cartesian coordinates to geographic according to the current ellipsoid of revolution.
 *
 * @param {Object} position - The coordinate to convert
 * @param {number} position.x
 * @param {number} position.y
 * @param {number} position.z
 * @returns {EllipsoidCoordinate} an object describing the coordinates on the reference ellipsoid, angles are in degree
 */
Ellipsoid.prototype.cartesianToCartographic = function cartesianToCartographic(position) {
    // for details, see for example http://www.linz.govt.nz/data/geodetic-system/coordinate-conversion/geodetic-datum-conversions/equations-used-datum
    // TODO the following is only valable for oblate ellipsoid of revolution. do we want to support triaxial ellipsoid?
    const R = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
    const a = this.rayon_1; // x
    const b = this.rayon_3; // z
    const e = Math.abs((a * a - b * b) / (a * a));
    const f = 1 - Math.sqrt(1 - e);
    const rsqXY = Math.sqrt(position.x * position.x + position.y * position.y);

    const theta = Math.atan2(position.y, position.x);
    const nu = Math.atan(position.z / rsqXY * ((1 - f) + e * a / R));

    const sinu = Math.sin(nu);
    const cosu = Math.cos(nu);

    const phi = Math.atan((position.z * (1 - f) + e * a * sinu * sinu * sinu) / ((1 - f) * (rsqXY - e * a * cosu * cosu * cosu)));

    const h = (rsqXY * Math.cos(phi)) + position.z * Math.sin(phi) - a * Math.sqrt(1 - e * Math.sin(phi) * Math.sin(phi));

    return { longitude: theta * 180 / Math.PI, latitude: phi * 180 / Math.PI, h };
};

Ellipsoid.prototype.cartographicToCartesianArray = function cartographicToCartesianArray(coordCartoArray) {
    var cartesianArray = [];
    for (var i = 0; i < coordCartoArray.length; i++) {
        cartesianArray.push(this.cartographicToCartesian(coordCartoArray[i]));
    }

    return cartesianArray;
};

Ellipsoid.prototype.intersection = function intersection(ray) {
    var EPSILON = 0.0001;
    var O_C = ray.origin;
    var dir = ray.direction;
    // normalizeVector( dir );

    var a =
        ((dir.x * dir.x) / (this.size.x * this.size.x)) + ((dir.y * dir.y) / (this.size.y * this.size.y)) + ((dir.z * dir.z) / (this.size.z * this.size.z));

    var b =
        ((2 * O_C.x * dir.x) / (this.size.x * this.size.x)) + ((2 * O_C.y * dir.y) / (this.size.y * this.size.y)) + ((2 * O_C.z * dir.z) / (this.size.z * this.size.z));
    var c =
        ((O_C.x * O_C.x) / (this.size.x * this.size.x)) + ((O_C.y * O_C.y) / (this.size.y * this.size.y)) + ((O_C.z * O_C.z) / (this.size.z * this.size.z)) - 1;

    var d = ((b * b) - (4 * a * c));
    if (d < 0 || a === 0 || b === 0 || c === 0)
        { return false; }

    d = Math.sqrt(d);

    var t1 = (-b + d) / (2 * a);
    var t2 = (-b - d) / (2 * a);

    if (t1 <= EPSILON && t2 <= EPSILON) return false; // both intersections are behind the ray origin
    // var back = (t1 <= EPSILON || t2 <= EPSILON); // If only one intersection (t>0) then we are inside the ellipsoid and the intersection is at the back of the ellipsoid
    var t = 0;
    if (t1 <= EPSILON)
        { t = t2; }
    else
    if (t2 <= EPSILON)
        { t = t1; }
    else
        { t = (t1 < t2) ? t1 : t2; }

    if (t < EPSILON) return false; // Too close to intersection

    var inter = new THREE.Vector3();

    inter.addVectors(ray.origin, dir.clone().setLength(t));

    return inter;
    /*
    var normal = intersection.clone();//-ellipsoid.center;
    normal.x = 2*normal.x/(this.size.x*this.size.x);
    normal.y = 2*normal.y/(this.size.y*this.size.y);
    normal.z = 2*normal.z/(this.size.z*this.size.z);

    //normal.w = 0.f;
    normal *= (back) ? -1.f : 1.f;
    normalizeVector(normal);
    */
};

Ellipsoid.prototype.computeDistance = function computeDistance(coordCarto1, coordCarto2) {
    var longitude1 = coordCarto1.longitude() * Math.PI / 180;
    var latitude1 = coordCarto1.latitude() * Math.PI / 180;
    var longitude2 = coordCarto2.longitude() * Math.PI / 180;
    var latitude2 = coordCarto2.latitude() * Math.PI / 180;

    var distRad = Math.acos(Math.sin(latitude1) * Math.sin(latitude2) + Math.cos(latitude1) * Math.cos(latitude2) * Math.cos(longitude2 - longitude1));

    var a = this.rayon_1;
    var b = this.rayon_3;
    var e = Math.sqrt((a * a - b * b) / (a * a));
    var latMoy = (latitude1 + latitude2) / 2;
    var rho = (a * (1 - e * e)) / Math.sqrt(1 - e * e * Math.sin(latMoy) * Math.sin(latMoy));
    var N = a / Math.sqrt(1 - e * e * Math.sin(latMoy) * Math.sin(latMoy));

    var distMeter = distRad * Math.sqrt(rho * N);
    return distMeter;
};


export default Ellipsoid;
