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
    this._oneOverRadiiSquared = new THREE.Vector3(1/(size.x * size.x), 1/(size.y * size.y), 1/(size.z * size.z));
  
    /**
     * Ellipsoid parameters; major axis (a), minor axis (b), and flattening (f) for each ellipsoid.
    */
    this.WGS84 =  { a: 6378137,     b: 6356752.31425, f: 1/298.257223563 };
    this.GRS80 =  { a: 6378137,     b: 6356752.31414, f: 1/298.257222101 };
    this.Airy1830 = { a: 6377563.396, b: 6356256.909,   f: 1/299.3249646 };
    this.AiryModified = { a: 6377340.189, b: 6356034.448,   f: 1/299.3249646 };
    this.Intl1924 =  { a: 6378388,     b: 6356911.946,   f: 1/297           };
    this.Bessel1841 =  { a: 6377397.155, b: 6356078.963,   f: 1/299.152815351};
    
    /**
    * Datums; with associated ellipsoid, and Helmert transform parameters to convert from WGS 84 into
    * given datum.
     *
    * Note that precision of various datums will vary, and WGS-84 (original) is not defined to be
    * accurate to better than ±1 metre. No transformation should be assumed to be accurate to better
    * than a meter; for many datums somewhat less.
    */
   
    this.datum = {
                    // transforms: t in metres, s in ppm, r in arcseconds                    tx       ty        tz       s        rx       ry       rz
                    ED50:       { ellipsoid: this.Intl1924,      transform: [   89.5,    93.8,    123.1,    -1.2,     0.0,     0.0,     0.156  ] },
                    Irl1975:    { ellipsoid: this.AiryModified,  transform: [ -482.530, 130.596, -564.557,  -8.150,  -1.042,  -0.214,  -0.631  ] },
                    NAD27:      { ellipsoid: this.Clarke1866,    transform: [    8,    -160,     -176,       0,       0,       0,       0      ] },
                    NAD83:      { ellipsoid: this.GRS80,         transform: [    1.004,  -1.910,   -0.515,  -0.0015,  0.0267,  0.00034, 0.011  ] },
                    NTF:        { ellipsoid: this.Clarke1880IGN, transform: [  168,      60,     -320,       0,       0,       0,       0      ] },
                    OSGB36:     { ellipsoid: this.Airy1830,      transform: [ -446.448, 125.157, -542.060,  20.4894, -0.1502, -0.2470, -0.8421 ] },
                    Potsdam:    { ellipsoid: this.Bessel1841,    transform: [ -582,    -105,     -414,      -8.3,     1.04,    0.35,   -3.08   ] },
                    TokyoJapan: { ellipsoid: this.Bessel1841,    transform: [  148,    -507,     -685,       0,       0,       0,       0      ] },
                    WGS72:      { ellipsoid: this.WGS72,         transform: [    0,       0,     -4.5,      -0.22,    0,       0,       0.554  ] },
                    WGS84:      { ellipsoid: this.WGS84,         transform: [    0.0,     0.0,      0.0,     0.0,     0.0,     0.0,     0.0    ] }
    };
};

Ellipsoid.prototype.geodeticSurfaceNormal = function(position) {
        var ret = new THREE.Vector3().copy(position);
            ret.multiply(this._oneOverRadiiSquared);
        return ret.normalize();
};


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
