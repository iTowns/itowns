/**
 * Generated On: 2015-10-5
 * Class: Ellipsoid
 * Description: Classe mathématique de  l'ellispoide
 */



import THREE from 'THREE';

function Ellipsoid(size) {
    //Constructor


    this.rayon_1 = size.x;
    this.rayon_2 = size.y;
    this.rayon_3 = size.z;

    this.size = new THREE.Vector3(size.x, size.y, size.z);

    this._radiiSquared = new THREE.Vector3(size.x * size.x, size.y * size.y, size.z * size.z);
}

Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(coordCarto) {

    var longitude = coordCarto.longitude;
    var latitude = coordCarto.latitude;
    var cosLatitude = Math.cos(latitude);

    var x = cosLatitude * Math.cos(-longitude);
    var z = cosLatitude * Math.sin(-longitude);
    var y = Math.sin(latitude);

    var result = new THREE.Vector3(x, y, z);

    return result.normalize();

};

Ellipsoid.prototype.setSize = function(size) {
    this.rayon_1 = size.x;
    this.rayon_2 = size.y;
    this.rayon_3 = size.z;

    this._radiiSquared = new THREE.Vector3(size.x * size.x, size.y * size.y, size.z * size.z);
};


Ellipsoid.prototype.cartographicToCartesian = function(coordCarto) {

    //var n;
    var k = new THREE.Vector3();
    var n = this.geodeticSurfaceNormalCartographic(coordCarto);

    k.multiplyVectors(this._radiiSquared, n);

    var gamma = Math.sqrt(n.dot(k));

    k.divideScalar(gamma);

    n.multiplyScalar(coordCarto.altitude);

    //n.multiplyScalar(0.0);

    return k.add(n);
};

Ellipsoid.prototype.cartographicToCartesianArray = function(coordCartoArray) {

    var cartesianArray = [];
    for (var i = 0; i < coordCartoArray.length; i++) {
        cartesianArray.push(this.cartographicToCartesian(coordCartoArray[i]));
    }

    return cartesianArray;

};

Ellipsoid.prototype.intersection = function(ray) {

    var EPSILON = 0.0001;
    var O_C = ray.origin;
    var dir = ray.direction;
    //normalizeVector( dir );

    var a =
        ((dir.x * dir.x) / (this.size.x * this.size.x)) + ((dir.y * dir.y) / (this.size.y * this.size.y)) + ((dir.z * dir.z) / (this.size.z * this.size.z));

    var b =
        ((2 * O_C.x * dir.x) / (this.size.x * this.size.x)) + ((2 * O_C.y * dir.y) / (this.size.y * this.size.y)) + ((2 * O_C.z * dir.z) / (this.size.z * this.size.z));
    var c =
        ((O_C.x * O_C.x) / (this.size.x * this.size.x)) + ((O_C.y * O_C.y) / (this.size.y * this.size.y)) + ((O_C.z * O_C.z) / (this.size.z * this.size.z)) - 1;

    var d = ((b * b) - (4 * a * c));
    if (d < 0 || a === 0 || b === 0 || c === 0)
        return false;

    d = Math.sqrt(d);

    var t1 = (-b + d) / (2 * a);
    var t2 = (-b - d) / (2 * a);

    if (t1 <= EPSILON && t2 <= EPSILON) return false; // both intersections are behind the ray origin
    //var back = (t1 <= EPSILON || t2 <= EPSILON); // If only one intersection (t>0) then we are inside the ellipsoid and the intersection is at the back of the ellipsoid
    var t = 0;
    if (t1 <= EPSILON)
        t = t2;
    else
    if (t2 <= EPSILON)
        t = t1;
    else
        t = (t1 < t2) ? t1 : t2;

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

Ellipsoid.prototype.computeDistance = function(coordCarto1, coordCarto2) {

    var longitude1 = coordCarto1.longitude * Math.PI / 180;
    var latitude1 = coordCarto1.latitude * Math.PI / 180;
    var longitude2 = coordCarto2.longitude * Math.PI / 180;
    var latitude2 = coordCarto2.latitude * Math.PI / 180;

    var distRad = Math.acos(Math.sin(latitude1) * Math.sin(latitude2) + Math.cos(latitude1) * Math.cos(latitude2) * Math.cos(longitude2 - longitude1));

    var a = this.rayon_1;
    var b = this.rayon_2;
    var e = Math.sqrt((a * a - b * b) / (a * a));
    var latMoy = (latitude1 + latitude2) / 2;
    var rho = (a * (1 - e * e)) / Math.sqrt(1 - e * e * Math.sin(latMoy) * Math.sin(latMoy));
    var N = a / Math.sqrt(1 - e * e * Math.sin(latMoy) * Math.sin(latMoy));

    var distMeter = distRad * Math.sqrt(rho * N);
    return distMeter;
};


export default Ellipsoid;
