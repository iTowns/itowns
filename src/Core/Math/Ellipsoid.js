/**
 * Generated On: 2015-10-5
 * Class: Ellipsoid
 * Description: Classe mathématique de  l'ellispoide
 */



define('Core/Math/Ellipsoid',
     ['Core/Math/MathExtented','Core/Geographic/CoordCarto','THREE',     
    'Core/Geographic/Projection'], function(MathExt,CoordCarto, THREE,Projection) {
    
    var projectionTools = new Projection();

    function Ellipsoid(size) {
        //Constructor

        this.rayon_1 = size.x;
        this.rayon_2 = size.y;
        this.rayon_3 = size.z;

        this.size = size;

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

    Ellipsoid.prototype.projectionToVertexPosition = function(projection)
    {
        return this.cartographicToCartesian(projection);
    };

    Ellipsoid.prototype.uProjection = function(u,projection,bbox)
    {
        projection.longitude = bbox.minCarto.longitude + u * bbox.dimension.x;
    };

    Ellipsoid.prototype.vProjection = function(v,projection,bbox)
    {
        projection.latitude = bbox.minCarto.latitude + v * bbox.dimension.y;
    };

    Ellipsoid.prototype.getProjectionUV = function()
    {
        return new CoordCarto();
    };

    Ellipsoid.prototype.getUV1 = function(projection,nbRow)
    {
        var t =  projectionTools.WGS84ToOneSubY(projection.latitude)*nbRow;

        if (!isFinite(t))
            t = 0;

        return t;
    };

    Ellipsoid.prototype.getDUV1 = function(bbox,nbRow)
    {
        var st1 = projectionTools.WGS84ToOneSubY(bbox.minCarto.latitude); 

        if (!isFinite(st1))
            st1 = 0;        
        
        var sizeTexture = 1.0 / nbRow;
        
        var start = (st1 % (sizeTexture));
        
        return (st1 - start)*nbRow;
    };

    return Ellipsoid;

});
