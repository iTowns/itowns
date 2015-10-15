/**
* Generated On: 2015-10-5
* Class: Ellipsoid
* Description: Classe mathématique de  l'ellispoide
*/



define('Core/Math/Ellipsoid',['Core/Math/MathExtented','THREE'], function(MathExt,THREE){

    function Ellipsoid(x,y,z)
    {
        //Constructor

        this.rayon_1 = x;
        this.rayon_2 = y;
        this.rayon_3 = z;


        this._radiiSquared = new THREE.Vector3(x*x,y*y,z*z);
    }
    
    //var cartographicToCartesianNormal   = new THREE.Vector3();
    var cartographicToCartesianK        = new THREE.Vector3();
    
    Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(coordCarto) {
    
        var longitude   = coordCarto.longitude;
        var latitude    = coordCarto.latitude;
        var cosLatitude = Math.cos(latitude);

        var x = cosLatitude * Math.cos(-longitude);
        var z = cosLatitude * Math.sin(-longitude);
        var y = Math.sin(latitude);
        
        
        var    result = new THREE.Vector3(x,y,z);

        return result.normalize();


    };
    
    
    Ellipsoid.prototype.cartographicToCartesian = function(coordCarto) 
    {
        
        var n;
        var k = cartographicToCartesianK;
        var n = this.geodeticSurfaceNormalCartographic(coordCarto);
     
        k.multiplyVectors(this._radiiSquared, n);
               
        var gamma = Math.sqrt(n.dot(k));        
               
        k.divideScalar( gamma);
        
        //n.multiplyScalar(coordCarto.altitude);
        
        n.multiplyScalar(0.0);
        
        return k.add( n);
    };

    return Ellipsoid;

});
