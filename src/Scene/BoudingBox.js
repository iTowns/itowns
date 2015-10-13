/**
* Generated On: 2015-10-5
* Class: BoudingBox
* Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
*/

define('Scene/BoudingBox',['Core/defaultValue','Core/Math/MathExtented','Core/Math/Point2D'], function(defaultValue,MathExt,Point2D){

    function BoudingBox(minLongitude,maxLongitude, minLatitude ,maxLatitude ,minAltitude ,maxAltitude){
        //Constructor
        
        this.minLongitude   = defaultValue(minLongitude, 0);
        this.maxLongitude   = defaultValue(maxLongitude, MathExt.TWO_PI);
        this.minLatitude    = defaultValue(minLatitude, -MathExt.PI_OV_TWO);
        this.maxLatitude    = defaultValue(maxLatitude,  MathExt.PI_OV_TWO);
        this.minAltitude    = defaultValue(minAltitude, -10000);
        this.maxAltitude    = defaultValue(maxAltitude,  10000);
        
        this.dimension      = new Point2D(Math.abs(this.maxLongitude-this.minLongitude),Math.abs(this.maxLatitude-this.minLatitude));        
        this.halfDimension  = new Point2D(this.dimension.x * 0.5,this.dimension.y * 0.5);
        this.center         = new Point2D(this.minLongitude + this.halfDimension.x,this.minLatitude + this.halfDimension.y);
        
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