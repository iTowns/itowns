/**
* Generated On: 2015-10-5
* Class: WMTS_Provider
* Description: Fournisseur de données à travers un flux WMTS
*/


define('Core/Commander/Providers/WMTS_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/IoDriver_XBIL',
            'Core/Commander/Providers/IoDriver_Image',
            'Core/Commander/Providers/IoDriverXML',
            'when',
            'THREE',
            'Core/Commander/Providers/CacheRessource'], 
        function(
                Provider,
                IoDriver_XBIL,
                IoDriver_Image,
                IoDriverXML,
                when,
                THREE,                
                CacheRessource){


    function WMTS_Provider()
    {
        //Constructor
 
        Provider.call( this,new IoDriver_XBIL());
        this.cache         = CacheRessource();        
        this.ioDriverImage = new IoDriver_Image();
        this.ioDriverXML = new IoDriverXML();
                
        //var url = 'http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/BU.Building.kml';
        
//        var url = 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/BU.Building.kml';
//               
//        this.ioDriverXML.read(url).then(function(result)
//        {
//            
//            
//        });
    }

    WMTS_Provider.prototype = Object.create( Provider.prototype );

    WMTS_Provider.prototype.constructor = WMTS_Provider;
    
    
    /**
     * Return url wmts MNT
     * @param {type} coWMTS : coord WMTS
     * @returns {Object@call;create.url.url|String}
     */
    WMTS_Provider.prototype.url = function(coWMTS)
    {
        
        //var key    = "wmybzw30d6zg563hjlq8eeqb";
        //var key    = coWMTS.zoom > 11 ? "va5orxd0pgzvq3jxutqfuy0b" : "wmybzw30d6zg563hjlq8eeqb"; // clef pro va5orxd0pgzvq3jxutqfuy0b
        
        var key    = "va5orxd0pgzvq3jxutqfuy0b";
        
        var layer  = coWMTS.zoom > 11 ? "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES" : "ELEVATION.ELEVATIONGRIDCOVERAGE";        
        
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/x-bil;bits=32&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
            
    /**
     * Return url wmts orthophoto
     * @param {type} coWMTS
     * @returns {Object@call;create.urlOrtho.url|String}
     */
    WMTS_Provider.prototype.urlOrtho = function(coWMTS)
    {
        //var key    = "i9dpl8xge3jk0a0taex1qrhd"; 
        var key    = "va5orxd0pgzvq3jxutqfuy0b"; // clef pro
        
        var layer  = "ORTHOIMAGERY.ORTHOPHOTOS";
        //var layer  = "GEOGRAPHICALGRIDSYSTEMS.MAPS";
                
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
        
    /**
     * return texture float alpha THREE.js of MNT 
     * @param {type} coWMTS : coord WMTS
     * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
     */
    WMTS_Provider.prototype.getTextureBil = function(coWMTS)
    {
                        
        var url = this.url(coWMTS);            
        
        var textureCache = this.cache.getRessource(url);
        
        if(textureCache !== undefined)
        {
//            if (textureCache !== -1)
//                textureCache.needsUpdate = true;
            return when(textureCache);
        }
        
        if(coWMTS.zoom <= 2 )
        {
            var texture = -1;
            this.cache.addRessource(url,texture);
            return when(texture);
        }
        else if(coWMTS.zoom > 14)
        {
            return when(-2);
        }
        
        return this._IoDriver.read(url).then(function(result)
            {                                                        
                if(result !== undefined)
                {                    
                    result.texture = new THREE.DataTexture(result.floatArray,256,256,THREE.AlphaFormat,THREE.FloatType);                
                    //result.texture.needsUpdate = true;
                                        
                    this.cache.addRessource(url,result);
                    return result;
                }
                else
                {
                    var texture = -1;
                    this.cache.addRessource(url,texture);
                    return texture;
                }
            }.bind(this)
        );
    };

    /**
     * Return texture RGBA THREE.js of orthophoto
     * TODO : RGBA --> RGB remove alpha canal
     * @param {type} coWMTS
     * @param {type} id
     * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
     */
    WMTS_Provider.prototype.getTextureOrtho = function(coWMTS,id)
    {
        
        var pack = function(i)
        {
            this.texture;
            this.id      = i;
        };
        
        var result = new pack(id);
        
        var url = this.urlOrtho(coWMTS);        
        result.texture  = this.cache.getRessource(url);
        
        if(result.texture !== undefined)
        {                        
            return when(result);
        }        
        return this.ioDriverImage.read(url).then(function(image)
        {
            
            result.texture= new THREE.Texture(image);
                        
            this.cache.addRessource(url,result.texture);
            return result;
            
        }.bind(this));

    };

    return WMTS_Provider;
    
});