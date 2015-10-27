/**
* Generated On: 2015-10-5
* Class: WMTS_Provider
* Description: Fournisseur de données à travers un flux WMTS
*/


define('Core/Commander/Providers/WMTS_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/IoDriver_XBIL',
            'when',
            'THREE',
            'Core/Commander/Providers/CacheRessource'], 
        function(
                Provider,
                IoDriver_XBIL,
                when,
                THREE,
                
                CacheRessource){


    function WMTS_Provider()
    {
        //Constructor
 
        Provider.call( this,new IoDriver_XBIL());
        this.cache         = CacheRessource();
    }

    WMTS_Provider.prototype = Object.create( Provider.prototype );

    WMTS_Provider.prototype.constructor = WMTS_Provider;
    
    WMTS_Provider.prototype.url = function(coWMTS)
    {
        
        var key    = "wmybzw30d6zg563hjlq8eeqb";
        
        var layer  = "ELEVATION.ELEVATIONGRIDCOVERAGE";        
        
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/x-bil;bits=32&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
            
    WMTS_Provider.prototype.urlOrtho = function(coWMTS)
    {
        var key    = "i9dpl8xge3jk0a0taex1qrhd";
        
        var layer  = "ORTHOIMAGERY.ORTHOPHOTOS";
        
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
        
    WMTS_Provider.prototype.getTile = function(coWMTS)
    {
        var url = this.url(coWMTS);
        
        var textureCache = this.cache.addRessource(url);
        
        if(textureCache !== undefined)
        {
            textureCache.needsUpdate = true;
            return when(textureCache);
        }
        
        return this._IoDriver.read(url).then(function(buffer)
            {
                                
                var texture = new THREE.DataTexture(buffer,256,256,THREE.RGBAFormat,THREE.FloatType);
                
                this.cache.addRessource(url,texture);                                
                
                texture.needsUpdate = true;
                
                return texture;
            }.bind(this)
        );
    };


    return WMTS_Provider;
    
});