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
/*
        var step = function(val,stepVal)
            {
                if(val<stepVal)
                    return 1.0;
                else
                    return 0.0;

            };

            var exp2 = function(expo)
            {
                return Math.pow(2,expo);
            };

            function parseFloat2(str) {
                var float = 0, sign, order, mantiss,exp,
                int = 0, multi = 1;
                if (/^0x/.exec(str)) {
                    int = parseInt(str,16);
                }else{
                    for (var i = str.length -1; i >=0; i -= 1) {
                        if (str.charCodeAt(i)>255) {
                            console.log('Wrong string parametr');
                            return false;
                        }
                        int += str.charCodeAt(i) * multi;
                        multi *= 256;
                    }
                }
                sign = (int>>>31)?-1:1;
                exp = (int >>> 23 & 0xff) - 127;
                mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
                for (i=0; i<mantissa.length; i+=1){
                    float += parseInt(mantissa[i])? Math.pow(2,exp):0;
                    exp--;
                }
                return float*sign;
        }

        var decode32 = function(rgba) {
            var Sign = 1.0 - step(128.0,rgba[0])*2.0;
            var Exponent = 2.0 * (rgba[0]%128.0) + step(128.0,rgba[1]) - 127.0;
            //console.log(Exponent);
            var Mantissa = (rgba[1]%128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + parseFloat2(0x800000);
            console.log(parseFloat2(0x800000));
            var Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
            return Result;
        };
*/
        function WMTS_Provider(options) {
            //Constructor

            Provider.call(this, new IoDriver_XBIL());
            this.cache = CacheRessource();
            this.ioDriverImage = new IoDriver_Image();
            this.ioDriverXML = new IoDriverXML();
            this.projection = new Projection();
            this.support = options.support || false;

            this.layersWMTS = [];

            this.getTextureFloat;

            if(this.support)
                this.getTextureFloat = function(){return new THREE.Texture();};
            else
                this.getTextureFloat = function(buffer){

                    // Start float to RGBA uint8
                    //var bufferUint = new Uint8Array(buffer.buffer);
                    // var texture = new THREE.DataTexture(bufferUint, 256, 256);

                    var texture = new THREE.DataTexture(buffer, 256, 256, THREE.AlphaFormat, THREE.FloatType);

                    texture.needsUpdate = true;
                    return texture;

                };

        }

        WMTS_Provider.prototype = Object.create(Provider.prototype);

        WMTS_Provider.prototype.constructor = WMTS_Provider;

        WMTS_Provider.prototype.addLayer = function(layer)
        {

            var options = layer.wmtsOptions;
            var newBaseUrl =  layer.url +
                "?LAYER=" + options.name +
                "&FORMAT=" +  options.mimetype +
                "&SERVICE=WMTS" +
                "&VERSION=1.0.0" +
                "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=" + options.tileMatrixSet;

            var arrayLimits = Object.keys(options.tileMatrixSetLimits);

            var size = arrayLimits.length;

            var maxZoom = Number(arrayLimits[size-1]);
            var minZoom = maxZoom - size + 1;

            this.layersWMTS[layer.id] = {baseUrl : newBaseUrl,tileMatrixSet:options.tileMatrixSet,tileMatrixSetLimits: options.tileMatrixSetLimits,zoom:{min:minZoom,max:maxZoom}};

        };

        /**
         * Return url wmts orthophoto
         * @param {type} coWMTS
         * @returns {Object@call;create.urlOrtho.url|String}
         */
        WMTS_Provider.prototype.url = function(coWMTS,layerId) {

            var baseUrl =  this.layersWMTS[layerId].baseUrl;

            return baseUrl + "&TILEMATRIX=" + coWMTS.zoom + "&TILEROW=" + coWMTS.row + "&TILECOL=" + coWMTS.col;

        };

        WMTS_Provider.prototype.resolveService = function(services,zoom) {

            for (var i = 0; i < services.length; i++) {

                var service = services[i];
                var layerWMTS = this.layersWMTS[service];

                if(zoom >= layerWMTS.zoom.min && zoom <= layerWMTS.zoom.max )
                    return service;
            }
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

            var limits = this.layersWMTS[layerId].tileMatrixSetLimits[coWMTS.zoom];

            if (!limits || !coWMTS.isInside(limits)) {
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

                    // In RGBA elevation texture LinearFilter give some errors with nodata value.
                    // need to rewrite sample function in shader
                    //result.texture.magFilter = THREE.NearestFilter;
                    //result.texture.minFilter = THREE.NearestFilter;


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

            var service;
            var destination = command.paramsFunction.layer.description.style.layerTile;
            var tile = command.requester;

            if(destination === 1)
            {
                return this.getColorTextures(tile,command.paramsFunction.layer.services).then(function(result)
                {
                    this.setTexturesLayer(result,destination);
                }.bind(tile));
            }
            else if (destination === 0)
            {
                parent = tile.level === tile.levelElevation ? tile : tile.getParentLevel(tile.levelElevation);

                if(parent.downScaledLayer(0))
                {

                    service = this.resolveService(command.paramsFunction.layer.services,tile.level);

                    return this.getElevationTexture(parent.tileCoord,service).then(function(terrain)
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



        WMTS_Provider.prototype.getColorTextures = function(tile,layerWMTSId) {

            var promises = [];
            var nColorLayers = 0;

            for (var i = 0; i < layerWMTSId.length; i++) {

                var layer = this.layersWMTS[layerWMTSId[i]];
                var lookAtAncestor = tile.material.getLevelLayerColor(1) === -1;

                if (tile.level >= layer.zoom.min && tile.level <= layer.zoom.max)
                {

                    var ancestor = tile.getParentNotDownScaled(1) || tile ;
                    var levelParent = (ancestor.level ) + 1;
                    var box = this.projection.getCoordWMTS_WGS84(tile, layer.tileMatrixSet);
                    var col = box[0].col;

                    if(lookAtAncestor)
                        tile.texturesNeeded += box[1].row + 1 - box[0].row;

                    nColorLayers++;

                    for (var row = box[0].row; row < box[1].row + 1; row++) {

                       var cooWMTS = new CoordWMTS(box[0].zoom, row, col);
                       var pitch = new THREE.Vector3(0.0,0.0,1.0);

                       if(lookAtAncestor)
                       {
                            var zoom = levelParent < layer.zoom.min ? tile.level+1 : levelParent;
                            cooWMTS = this.projection.WMTS_WGS84Parent(cooWMTS,zoom,pitch);
                       }

                       promises.push(this.getColorTexture(cooWMTS,pitch,layerWMTSId[i]));

                    }
                }
            }

            tile.material.uniforms.nColorLayer.value = nColorLayers;

            if (promises.length)
                return when.all(promises);
            else
                return when();

       };

       return WMTS_Provider;

    });
