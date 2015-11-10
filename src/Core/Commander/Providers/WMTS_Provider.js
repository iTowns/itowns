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
        
        this.loader = new THREE.TextureLoader();        
        this.loader.crossOrigin = '';
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
        //var layer  = "GEOGRAPHICALGRIDSYSTEMS.MAPS";
                
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
        
    WMTS_Provider.prototype.getTextureBil = function(coWMTS)
    {
        
        var url = this.url(coWMTS);
        
        var textureCache = this.cache.getRessource(url);
        
        if(textureCache !== undefined)
        {
            if (textureCache !== -1)
                textureCache.needsUpdate = true;
            return when(textureCache);
        }
        
        if(coWMTS.zoom < 2)
        {
            var texture = -1;
            this.cache.addRessource(url,texture);
            when(texture);
        }
        
        return this._IoDriver.read(url).then(function(buffer)
            {                        
                var texture;
                
                if(buffer === undefined)
                    texture = -1;
                else
                {
                    texture = new THREE.DataTexture(buffer,256,256,THREE.AlphaFormat,THREE.FloatType);                
                    texture.needsUpdate = true;
                }
                
                this.cache.addRessource(url,texture);
                
                return texture;
            }.bind(this)
        );
    };

    WMTS_Provider.prototype.getTextureOrtho = function(coWMTS)
    {
                
        var url = this.urlOrtho(coWMTS);        
        var textureCache = this.cache.getRessource(url);
        
        if(textureCache !== undefined)
        {            
            //textureCache.needsUpdate = true;            
            return when(textureCache);
        }
        
        var texture = this.loader.load(url);
        
        //texture.needsUpdate = true;
        
        this.cache.addRessource(url,texture);
        
        return when(texture);
    };

    return WMTS_Provider;
    
});