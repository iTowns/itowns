/**
* Generated On: 2015-10-5
* Class: WMTS_Provider
* Description: Fournisseur de données à travers un flux WMTS
*/


define('Core/Commander/Providers/WMTS_Provider',['Core/Commander/Providers/Provider','Core/Commander/Providers/IoDriver_XBIL','THREE'], function(Provider,IoDriver_XBIL,THREE){


    function WMTS_Provider()
    {
        //Constructor
 
        Provider.call( this,new IoDriver_XBIL());
  
    }

    WMTS_Provider.prototype = Object.create( Provider.prototype );

    WMTS_Provider.prototype.constructor = WMTS_Provider;
    
    WMTS_Provider.prototype.url = function(zoom,x,y)
    {
        
        var key    = "wmybzw30d6zg563hjlq8eeqb";
        
        var layer  = "ELEVATION.ELEVATIONGRIDCOVERAGE";        
        
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/x-bil;bits=32&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+zoom+"&TILEROW="+x+"&TILECOL="+y;
        return url;
    };
            
    WMTS_Provider.prototype.urlOrtho = function(zoom,x,y)
    {
        var key    = "i9dpl8xge3jk0a0taex1qrhd";
        
        var layer  = "ORTHOIMAGERY.ORTHOPHOTOS";
        
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+zoom+"&TILEROW="+y+"&TILECOL="+x;
        return url;
    };
        
    WMTS_Provider.prototype.getTile = function(zoom,x,y)
    {
        return this._IoDriver.read(this.url(zoom,x,y)).then(function(buffer)
            {
                var texture = new THREE.DataTexture(buffer,256,256,THREE.RGBAFormat,THREE.FloatType);
                
                texture.needsUpdate = true;
                
                return texture;
            }
        );
    };


    return WMTS_Provider;
    
});