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
    
    Projection.prototype.WGS84ToY = function(latitude){
        
        return 0.5 - Math.log(Math.tan(MathExt.PI_OV_FOUR+latitude*0.5))*MathExt.INV_TWO_PI;

    };
    
    Projection.prototype.WGS84LatitudeClamp = function(latitude){
        
        var min = -68.1389  / 180 * Math.PI;
        var max =  80       / 180 * Math.PI;

        latitude = Math.max(min,latitude);
        latitude = Math.min(max,latitude);

        return latitude;

    };

    /**
     * 
     * @param {type} cWMTS
     * @param {type} bbox
     * @returns {Array}
     */
    Projection.prototype.WMTS_WGS84ToWMTS_PM = function(cWMTS,bbox){

        var wmtsBox = [];
        var level   = cWMTS.zoom + 1;               
        var nbRow   = Math.pow(2,level);
        var sizeRow = 1 / nbRow;
        
        var y0  = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.minCarto.latitude));
        var y1  = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.maxCarto.latitude));
        
        var minRow,maxRow,minFra,maxFra,min,max,yMax,ymin;
        
        yMax = Math.max(y0,y1);
        yMin = Math.min(y0,y1);
              
        min     = yMin/ sizeRow;
        max     = yMax/ sizeRow;            
            
        minRow = Math.floor(min);
        maxRow = Math.ceil (max);

        minFra  = Math.abs(yMin - minRow * sizeRow);
        maxFra  = Math.abs(yMax - maxRow * sizeRow);

        //console.log(minFra + '|' + maxFra);

        var minCol = cWMTS.col;
        var maxCol = minCol;
        
        wmtsBox.push(new CoordWMTS(level,minRow,minCol));
        wmtsBox.push(new CoordWMTS(level,maxRow,maxCol));  
                       
        return wmtsBox;

    };

    /**
    * @param x
    * @param y
    */
    Projection.prototype.PMToWGS84 = function(x, y){
        //TODO: Implement Me 

    };
    
    Projection.prototype.WGS84toWMTS = function(bbox){
        

        var zoom    = Math.floor(Math.log(MathExt.PI / bbox.dimension.y )/MathExt.LOG_TWO + 0.5);
        
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