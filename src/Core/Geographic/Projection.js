/**
* Generated On: 2015-10-5
* Class: Projection
* Description: Outils de projections cartographiques et de convertion
*/

define('Core/Geographic/Projection',['Core/Geographic/CoordWMTS','Core/Math/MathExtented'], function(CoordWMTS,MathExt){


    function Projection(){
        //Constructor

    }

    /**
    * @param x
    * @param y
    */
    Projection.prototype.WGS84ToPM = function(x, y){
        //TODO: Implement Me 

    };


    /**
    * @param x
    * @param y
    */
    Projection.prototype.PMToWGS84 = function(x, y){
        //TODO: Implement Me 

    };
    
    Projection.prototype.WGS84toWMTS = function(bbox){
        

        var zoom    = Math.log(MathExt.PI / bbox.dimension.y)/MathExt.LOG_TWO;
        
        var nY      = Math.pow(2,zoom);
        var nX      = 2*nY;
        
        var uX      = MathExt.TWO_PI    / nX;
        var uY      = MathExt.PI        / nY;
        
        var col       = Math.floor(bbox.center.x / uX);
        var row       = Math.floor(nY - (MathExt.PI_OV_TWO + bbox.center.y) / uY);
        
        return new CoordWMTS(zoom,row,col);
    };


    /**
    * @param longi
    * @param lati
    */
    Projection.prototype.geoToPM = function(longi, lati){
        //TODO: Implement Me 

    };


    /**
    * @param longi
    * @param lati
    */
    Projection.prototype.geoToWGS84 = function(longi, lati){
        //TODO: Implement Me 

    };

    return Projection;

});