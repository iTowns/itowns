/**
* Generated On: 2015-10-5
* Class: BoudingBox
* Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
*/

define('Scene/BoudingBox',['Core/defaultValue','Core/Math/MathExtented','Core/Math/Point2D','Core/Geographic/CoordCarto','THREE','OBB'], function(defaultValue,MathExt,Point2D,CoordCarto,THREE,OBB){

    function BoudingBox(minLongitude,maxLongitude, minLatitude ,maxLatitude ,parentCenter,minAltitude ,maxAltitude){
        //Constructor
        
        this.minCarto       = new CoordCarto(defaultValue(minLongitude,0),defaultValue(minLatitude,-MathExt.PI_OV_TWO),defaultValue(minAltitude,-10000));
        this.maxCarto       = new CoordCarto(defaultValue(maxLongitude,MathExt.TWO_PI),defaultValue(maxLatitude,MathExt.PI_OV_TWO),defaultValue(maxAltitude,10000));
        
        this.dimension      = new Point2D(Math.abs(this.maxCarto.longitude-this.minCarto.longitude),Math.abs(this.maxCarto.latitude-this.minCarto.latitude));        
        this.halfDimension  = new Point2D(this.dimension.x * 0.5,this.dimension.y * 0.5);
        this.center         = new Point2D(this.minCarto.longitude + this.halfDimension.x,this.minCarto.latitude + this.halfDimension.y);
        //this.relativeCenter = parentCenter === undefined ? this.center : new Point2D(this.center.x - parentCenter.x,this.center.y - parentCenter.y);
        this.size           = Math.sqrt(this.dimension.x * this.dimension.x + this.dimension.y * this.dimension.y);
        
    }

    /**
    * @documentation: Retourne True si le point est dans la zone
    *
    * @param point {[object Object]} 
    */
    BoudingBox.prototype.isInside = function(point){
        //TODO: Implement Me 

    };
    
    BoudingBox.prototype.set = function(center,halfDimension){
       
       this.halfDimension  = halfDimension;        
       this.center         = center;

    };
    
    
    BoudingBox.prototype.get3DBBox = function(ellipsoid,normal,center){
       
        var cardinals       = [];
        
        var phiStart        = this.minCarto.longitude ;
        var phiLength       = this.dimension.x;

        var thetaStart      = this.minCarto.latitude ;
        var thetaLength     = this.dimension.y;
        
        //      0---1---2
        //      |       |
        //      7       3
        //      |       |
        //      6---5---4
        
        cardinals.push(new CoordCarto(phiStart                        , thetaStart    ,0));
        cardinals.push(new CoordCarto(phiStart + this.halfDimension.x , thetaStart    ,0));
        cardinals.push(new CoordCarto(phiStart + phiLength            , thetaStart    ,0));
        cardinals.push(new CoordCarto(phiStart + phiLength            , thetaStart + this.halfDimension.y,0));        
        cardinals.push(new CoordCarto(phiStart + phiLength            , thetaStart + thetaLength  ,0));
        cardinals.push(new CoordCarto(phiStart + this.halfDimension.x , thetaStart + thetaLength  ,0));        
        cardinals.push(new CoordCarto(phiStart                        , thetaStart + thetaLength  ,0));
        cardinals.push(new CoordCarto(phiStart                        , thetaStart + this.halfDimension.y,0));
        
        var cardinals3D     = [];                 
        var cardin3DPlane   = [];
        
        var maxV            = new THREE.Vector3(-1000,-1000,-1000);
        var minV            = new THREE.Vector3(1000,1000,1000);        
        var maxHeight       = 0;        
        var planeZ          = new THREE.Quaternion();
        var qRotY           = new THREE.Quaternion();
        var vec             = new THREE.Vector3();
        var tangentPlane    = new THREE.Plane(normal);
        
        planeZ.setFromUnitVectors(normal,new THREE.Vector3(0,1,0));        
        qRotY.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -this.center.x );        
        qRotY.multiply(planeZ);
        
        for ( var i = 0; i < cardinals.length; i++ )
        {
                cardinals3D.push(ellipsoid.cartographicToCartesian(cardinals[i]));
                cardin3DPlane.push(tangentPlane.projectPoint(cardinals3D[i]));
                vec.subVectors(cardinals3D[i],center);
                maxHeight    = Math.max(maxHeight,cardin3DPlane[i].distanceTo(vec));                    
                cardin3DPlane[i].applyQuaternion( qRotY );
                maxV.max(cardin3DPlane[i]);
                minV.min(cardin3DPlane[i]);
        }
       
        var width       = Math.abs(maxV.z - minV.z);
        var height      = Math.abs(maxV.x - minV.x);
                
        var delta       = height * 0.5 - Math.abs(cardin3DPlane[5].x);
        var geometry    = new THREE.BoxGeometry(width,height,maxHeight);        
        var material    = new THREE.MeshBasicMaterial( {color : 0xff0000,wireframe : true} );
        var bbox3D      = new THREE.Mesh( geometry, material );
        var bbox3D2     = new THREE.Mesh( geometry, material );
        
        var dummy       = new THREE.Mesh( new THREE.BoxGeometry(1,1,0.2));        
        var helper      = new THREE.Mesh();
        
        bbox3D.position.copy(center);
        bbox3D.lookAt(normal);
        bbox3D.translateZ(maxHeight*0.5);
        bbox3D.translateY(delta);
        
        helper.add(bbox3D);
        helper.add(bbox3D2);
        bbox3D.add(dummy);
        
        var o3D = new THREE.Object3D();
        o3D.position.copy(center);
        o3D.lookAt(normal);
        o3D.translateZ(maxHeight*0.5);
        o3D.translateY(delta);
        
        var child = new THREE.Object3D();
        
        o3D.add(child);

        var obb = new THREE.OBB(minV,maxV,o3D,helper);

        return obb;
       
    };
    

    return BoudingBox;
    
});