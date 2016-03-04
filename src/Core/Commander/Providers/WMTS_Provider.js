/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */


define('Core/Commander/Providers/WMTS_Provider', [
        'Core/Commander/Providers/Provider',
        'Core/Geographic/Projection',
        'Core/Geographic/CoordWMTS',
        'Core/Commander/Providers/IoDriver_XBIL',
        'Core/Commander/Providers/IoDriver_Image',
        'Core/Commander/Providers/IoDriverXML',
        'when',
        'THREE',
        'Core/Commander/Providers/CacheRessource'
    ],
    function(
        Provider,
        Projection,
        CoordWMTS,
        IoDriver_XBIL,
        IoDriver_Image,
        IoDriverXML,
        when,
        THREE,
        CacheRessource) {


        function WMTS_Provider(options) {
            //Constructor
            
            Provider.call(this, new IoDriver_XBIL());
            this.cache = CacheRessource();
            this.ioDriverImage = new IoDriver_Image();
            this.ioDriverXML = new IoDriverXML();
            this.projection = new Projection();
            this.baseUrl = options.url || "http://wxs.ign.fr/";
            this.layer   = options.layer || "ORTHOIMAGERY.ORTHOPHOTOS";
            this.support = options.support || false;
            
            this.getTextureFloat;
            
            if(this.support)
                this.getTextureFloat = function(){return new THREE.Texture();};
            else
                this.getTextureFloat = function(buffer){return new THREE.DataTexture(buffer, 256, 256, THREE.AlphaFormat, THREE.FloatType);};

        }

        WMTS_Provider.prototype = Object.create(Provider.prototype);

        WMTS_Provider.prototype.constructor = WMTS_Provider;


        /**
         * Return url wmts MNT
         * @param {type} coWMTS : coord WMTS
         * @returns {Object@call;create.url.url|String}
         */
        WMTS_Provider.prototype.url = function(coWMTS) {
            var key = "va5orxd0pgzvq3jxutqfuy0b";
            var layer = coWMTS.zoom > 11 ? "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES" : "ELEVATION.ELEVATIONGRIDCOVERAGE";

            var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER=" + layer +
                "&FORMAT=image/x-bil;bits=32&SERVICE=WMTS&VERSION=1.0.0" +
                "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM" +
                "&TILEMATRIX=" + coWMTS.zoom + "&TILEROW=" + coWMTS.row + "&TILECOL=" + coWMTS.col;
            return url;
        };

        /**
         * Return url wmts orthophoto
         * @param {type} coWMTS
         * @returns {Object@call;create.urlOrtho.url|String}
         */
        WMTS_Provider.prototype.urlOrtho = function(coWMTS) {

            var key = "va5orxd0pgzvq3jxutqfuy0b";
            //var layer = "ORTHOIMAGERY.ORTHOPHOTOS";
            var url;

            if(this.baseUrl === "http://wxs.ign.fr/")      // Geoportal WMS structure
                url = this.baseUrl + key + "/geoportail/wmts?LAYER=" + this.layer +
                    "&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0" +
                    "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM" +
                    "&TILEMATRIX=" + coWMTS.zoom + "&TILEROW=" + coWMTS.row + "&TILECOL=" + coWMTS.col;
            else                                           // CartoDB WMS structure
               url = this.baseUrl + this.layer +
                     coWMTS.zoom + "/" + coWMTS.col + "/" + coWMTS.row +".png";  // (z/x/y)
                
            return url; //this.urlOrthoDarkMatter(coWMTS); //url;
        };        

        /**
         * return texture float alpha THREE.js of MNT 
         * @param {type} coWMTS : coord WMTS
         * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
         */
        WMTS_Provider.prototype.getTextureBil = function(coWMTS) {
             
            if (coWMTS === undefined)                
                return when(-2);
             
            var url = this.url(coWMTS);

            var textureCache = this.cache.getRessource(url);

            if (textureCache !== undefined)
                return when(textureCache);

            if (coWMTS.zoom <= 2) {
                var texture = -1;
                this.cache.addRessource(url, texture);
                return when(texture);
            }

            return this._IoDriver.read(url).then(function(result) {                                
                if (result !== undefined) {
                    
                    //TODO USE CACHE HERE ???
                      
                    result.texture = this.getTextureFloat(result.floatArray);
                    result.texture.generateMipmaps = false;
                    result.texture.magFilter = THREE.LinearFilter;
                    result.texture.minFilter = THREE.LinearFilter;                    
                    
                    // TODO ATTENTION verifier le context
                    result.level = coWMTS.zoom;
                    
                    
                    this.cache.addRessource(url, result);
     
                    return result;
                } else {
                    var texture = -1;
                    this.cache.addRessource(url, texture);
                    return texture;
                }
            }.bind(this));
        };

        /**
         * Return texture RGBA THREE.js of orthophoto
         * TODO : RGBA --> RGB remove alpha canal
         * @param {type} coWMTS
         * @param {type} id
         * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
         */
        WMTS_Provider.prototype.getTextureOrtho = function(coWMTS, pitch) {

            var pack = function(pitch) {
                this.texture;                
                this.pitch = pitch;
            };

            var result = new pack(pitch);

            var url = this.urlOrtho(coWMTS);
            result.texture = this.cache.getRessource(url);

            if (result.texture !== undefined) {
                return when(result);
            }
            return this.ioDriverImage.read(url).then(function(image) {
                                
                var texture = this.cache.getRessource(image.src);
                
                if(texture)                
                    result.texture = texture;                                
                else
                {
                    result.texture = new THREE.Texture(image);
                    result.texture.generateMipmaps = false;
                    result.texture.magFilter = THREE.LinearFilter;
                    result.texture.minFilter = THREE.LinearFilter;
                    result.texture.anisotropy = 16;
                    result.texture.url = url; 
                    result.texture['level'] = coWMTS.zoom;
                
                    this.cache.addRessource(url, result.texture);
                }
                                        
                return result;

            }.bind(this));

        };
        
        WMTS_Provider.prototype.executeCommand = function(command){                        
           
            
            if(command.paramsFunction.subLayer === 1)
            {
                
                return this.getOrthoImages(command.requester).then(function(result)
                {             
                    if(this.material === null) // TODO WHY??
                        return;
                    this.setTexturesLayer(result,1);                        
                    this.material.update();
                }.bind(command.requester));
            }                
            else if (command.paramsFunction.subLayer === 0)
            {
                
                var tile = command.requester;
                
                var parent = tile.level === tile.levelTerrain ? tile : tile.getParentLevel(tile.levelTerrain);
                
                if(parent === undefined)
                    return;
                

                if(parent.downScaledLayer(0))
                {                 
                    return this.getTextureBil(parent.cooWMTS).then(function(terrain)
                    {            
                        if(this.material === null)
                            return;
                        this.setTerrain(terrain);
                        this.material.update();

                    }.bind(parent)).then(function()
                    {
                        if(this.downScaledLayer(0))
                        {
                            if(this.material === null)
                                return;
                            this.setTerrain(-2);
                            this.material.update();
                        }

                    }.bind(tile));                                                                         
                }
                else
                {            
                    tile.setTerrain(-2);
                    tile.material.update();
                }
            }           
        };
        
        WMTS_Provider.prototype.getOrthoImages = function(tile) {

           var promises = [];

           if (tile.cooWMTS.zoom >= 2)
           {
               
               if(tile.material === null) // TODO WHy -> dispose??
                   return;               
               tile.material.nbTextures = 1;
               var box = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS, tile.bbox); // 
               var col = box[0].col;
               tile.orthoNeed = box[1].row + 1 - box[0].row;

               for (var row = box[0].row; row < box[1].row + 1; row++) {
                   
                   var cooWMTS = new CoordWMTS(box[0].zoom, row, col);
                   var pitch = new THREE.Vector3(0.0,0.0,1.0);
     
                   promises.push(this.getTextureOrtho(cooWMTS,pitch));

               }
               
               return when.all(promises);
           }
           else
           
               tile.checkOrtho();
                        
       };

       return WMTS_Provider;

    });
