/**
* Generated On: 2015-10-5
* Class: BoudingBox
* Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
*/

define('Scene/BoudingBox',['Core/defaultValue','Core/Math/MathExtented','Core/Math/Point2D','Core/Geographic/CoordCarto'], function(defaultValue,MathExt,Point2D,CoordCarto){

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

    return BoudingBox;
    
});