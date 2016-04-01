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
            //this.layer = "GEOGRAPHICALGRIDSYSTEMS.MAPS";
            this.support = options.support || false;


            this.baseUrlMap = [];

            this.getTextureFloat;

            if(this.support)
                this.getTextureFloat = function(){return new THREE.Texture();};
            else
                this.getTextureFloat = function(buffer){

                    var texture = new THREE.DataTexture(buffer, 256, 256, THREE.AlphaFormat, THREE.FloatType);
                    texture.needsUpdate = true;
                    return texture;

                };

        }

        WMTS_Provider.prototype = Object.create(Provider.prototype);

        WMTS_Provider.prototype.constructor = WMTS_Provider;

        WMTS_Provider.prototype.addLayer = function(layer)
        {

            var newBaseUrl =  layer.url +
                "?LAYER=" + layer.wmtsOptions.name +
                "&FORMAT=" +  layer.wmtsOptions.mimetype +
                "&SERVICE=WMTS&VERSION=1.0.0" +
                "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=" + layer.wmtsOptions.tileMatrixSet;

            this.baseUrlMap[layer.id] = newBaseUrl;

        };

        /**
         * Return url wmts orthophoto
         * @param {type} coWMTS
         * @returns {Object@call;create.urlOrtho.url|String}
         */
        WMTS_Provider.prototype.url = function(coWMTS,layerId) {


            var baseUrl =  this.baseUrlMap[layerId];

            return baseUrl + "&TILEMATRIX=" + coWMTS.zoom + "&TILEROW=" + coWMTS.row + "&TILECOL=" + coWMTS.col;

        };

        /**
         * return texture float alpha THREE.js of MNT
         * @param {type} coWMTS : coord WMTS
         * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
         */
        WMTS_Provider.prototype.getElevationTexture = function(coWMTS,layerId) {

            if (coWMTS === undefined)
                return when(-2);

            var url = this.url(coWMTS,layerId);

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
        WMTS_Provider.prototype.getColorTexture = function(coWMTS, pitch,layerId) {

            var pack = function(pitch) {
                this.texture;
                this.pitch = pitch;
            };

            var result = new pack(pitch);

            var url = this.url(coWMTS,layerId);
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
                    result.texture.needsUpdate = true;
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
                return this.getColorTextures(command.requester,command.paramsFunction.colorLayerId).then(function(result)
                {
                    this.setTexturesLayer(result,1);
                }.bind(command.requester));
            }
            else if (command.paramsFunction.subLayer === 0)
            {

                var tile = command.requester;

                var parent = tile.level === tile.levelElevation ? tile : tile.getParentLevel(tile.levelElevation);

                if(parent.downScaledLayer(0))
                {
                    var layerId = command.paramsFunction.elevationLayerId[parent.cooWMTS.zoom > 11 ? 1 : 0];

                    return this.getElevationTexture(parent.cooWMTS,layerId).then(function(terrain)
                    {
                        this.setTextureElevation(terrain);

                    }.bind(parent)).then(function()
                    {
                        if(this.downScaledLayer(0))

                            this.setTextureElevation(-2);

                    }.bind(tile));
                }
                else
                {
                    tile.setTextureElevation(-2);
                }
            }
        };

        WMTS_Provider.prototype.getColorTextures = function(tile,layerId) {


           if (tile.cooWMTS.zoom >= 2)
           {

                var promises = [];
                var lookAtAncestor = tile.currentLevelLayers[1] === -1;

                var box = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS, tile.bbox); //
                var col = box[0].col;

                var colorTexturesNeeded = box[1].row + 1 - box[0].row;

                if(lookAtAncestor)
                    tile.texturesNeeded += colorTexturesNeeded;
                else
                    tile.material.nbTextures -= colorTexturesNeeded;

                for (var row = box[0].row; row < box[1].row + 1; row++) {

                   var cooWMTS = new CoordWMTS(box[0].zoom, row, col);
                   var pitch = new THREE.Vector3(0.0,0.0,1.0);

                   if(lookAtAncestor && box[0].zoom > 3)
                   {
                        var levelParent = tile.getParentNotDownScaled(1).level + 1;
                        cooWMTS = this.projection.WMTS_WGS84Parent(cooWMTS,levelParent,pitch);
                   }

                   promises.push(this.getColorTexture(cooWMTS,pitch,layerId));

                }

                return when.all(promises);
           }
           else
                return when();

       };

       return WMTS_Provider;

    });
