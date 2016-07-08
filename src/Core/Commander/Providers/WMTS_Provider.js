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

            this.layersData = {};

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


        WMTS_Provider.prototype.customUrl = function(url,tilematrix,row,col)
        {

            var urld = url.replace('%TILEMATRIX',tilematrix.toString());
            urld = urld.replace('%ROW',row.toString());
            urld = urld.replace('%COL',col.toString());

            return urld;

        };

        WMTS_Provider.prototype.removeLayer = function(idLayer)
        {
            if(this.layersData[idLayer])
                this.layersData[idLayer] = undefined;

        }

        WMTS_Provider.prototype.addLayer = function(layer)
        {

            if(layer.protocol === 'wmtsc')
            {
                 this.layersData[layer.id] = {
                    customUrl: layer.customUrl,
                    tileMatrixSet:layer.wmtsOptions.tileMatrixSet,
                    zoom:{min:2,max:20},
                    fx : layer.fx || 0.0
                };
            }
            else
            {

                var options = layer.wmtsOptions;
                var newBaseUrl =  layer.url +
                    "?LAYER=" + options.name +
                    "&FORMAT=" +  options.mimetype +
                    "&SERVICE=WMTS" +
                    "&VERSION=1.0.0" +
                    "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=" + options.tileMatrixSet;

                newBaseUrl += "&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL";
                var arrayLimits = Object.keys(options.tileMatrixSetLimits);

                var size = arrayLimits.length;
                var maxZoom = Number(arrayLimits[size-1]);
                var minZoom = maxZoom - size + 1;
                this.layersData[layer.id] = {
                    customUrl: newBaseUrl,
                    mimetype:options.mimetype,
                    tileMatrixSet:options.tileMatrixSet,
                    tileMatrixSetLimits: options.tileMatrixSetLimits || 'none',
                    zoom:{min:minZoom,max:maxZoom},
                    fx : layer.fx || 0.0
                };
            }

        };

        /**
         * Return url wmts orthophoto
         * @param {type} coWMTS
         * @returns {Object@call;create.urlOrtho.url|String}
         */
        WMTS_Provider.prototype.url = function(coWMTS,layerId) {

            return this.customUrl(this.layersData[layerId].customUrl,coWMTS.zoom, coWMTS.row,coWMTS.col);

        };

        WMTS_Provider.prototype.resolveService = function(services,zoom) {

            for (var i = 0; i < services.length; i++) {

                var service = services[i];
                var layerWMTS = this.layersData[service];

                if(zoom >= layerWMTS.zoom.min && zoom <= layerWMTS.zoom.max )
                    return service;
            }
        };

        /**
         * return texture float alpha THREE.js of MNT
         * @param {type} coWMTS : coord WMTS
         * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
         */
        WMTS_Provider.prototype.getElevationTexture = function(tile,services) {

            tile.texturesNeeded += 1;

            var layerId = services[0];
            var layer = this.layersData[layerId];

            if(tile.level > layer.zoom.max)
            {
                layerId = services[1];
                layer = this.layersData[layerId];
            }

            // TEMP
            if (tile.currentElevation === -1 && tile.level  > layer.zoom.min )
                return when(-2);

            var coWMTS = tile.tileCoord;


            var url = this.url(coWMTS,layerId);

            var textureCache = this.cache.getRessource(url);

            if (textureCache !== undefined)
                return when(textureCache);


            // bug #74
            //var limits = layer.tileMatrixSetLimits[coWMTS.zoom];
            // if (!limits || !coWMTS.isInside(limits)) {
            //     var texture = -1;
            //     this.cache.addRessource(url, texture);
            //     return when(texture);
            // }
            // -> bug #74

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

            var result = {pitch:pitch};
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
                    result.texture.level = coWMTS.zoom;
                   // result.texture.layerId = layerId;

                    this.cache.addRessource(url, result.texture);
                }

                return result;

            }.bind(this)).catch(function(/*reason*/) {
                    //console.error('getColorTexture failed for url |', url, '| Reason:' + reason);
                    result.texture = null;

                    return result;
                });

        };

        WMTS_Provider.prototype.executeCommand = function(command){

            //var service;
            var destination = command.paramsFunction.layer.description.style.layerTile;
            var tile = command.requester;

            if(destination === 1)
            {
                return this.getColorTextures(tile,command.paramsFunction.layer.services).then(function(result)
                {
                    return command.resolve(result);
                });
            }
            else if (destination === 0)
            {

                parent = tile.level === tile.levelElevation ? tile : tile.getParentLevel(tile.levelElevation);

                if(parent.downScaledLayer(0))
                {

                    return this.getElevationTexture(parent,command.paramsFunction.layer.services).then(function(terrain)
                    {
                        this.setTextureElevation(terrain);

                    }.bind(parent)).then(function() {
                        if(this.downScaledLayer(0))
                            return command.resolve(-2);
                        else
                            return command.resolve(undefined);

                    }.bind(tile));
                }
                else
                {
                    return command.resolve(-2);
                }
            }
        };


        WMTS_Provider.prototype.getZoomAncestor = function(tile,layer) {

            var levelParent = tile.getLevelNotDownScaled();
            return (levelParent < layer.zoom.min ? tile.level : levelParent) + (layer.tileMatrixSet === 'PM' ? 1 : 0);

        }

        WMTS_Provider.prototype.tileInsideLimit = function(tile,layer) {

            //var limits = layer.tileMatrixSetLimits[tile.level];
            //!coWMTS.isInside(limits)
            //console.log(layer)
            return tile.level >= layer.zoom.min && tile.level <= layer.zoom.max;
        }

        WMTS_Provider.prototype.getColorTextures = function(tile,layerWMTSId) {

            var promises = [];
            if (tile.material === null) {
                return when();
            }
            
            // Request parent's texture if no texture at all
            var lookAtAncestor = tile.material.getLevelLayerColor(1) === -1;

            for (var i = 0; i < layerWMTSId.length; i++) {

                var layer = this.layersData[layerWMTSId[i]];

                if (this.tileInsideLimit(tile,layer)) {
                    var bcoord = tile.matrixSet[layer.tileMatrixSet];

                    // WARNING the direction textures is important
                    for (var row = bcoord[1].row; row >=  bcoord[0].row; row--) {

                       var cooWMTS = new CoordWMTS(bcoord[0].zoom, row, bcoord[0].col);
                       var pitch = new THREE.Vector3(0.0,0.0,1.0);

                       if(lookAtAncestor) {
                            cooWMTS = this.projection.WMTS_WGS84Parent(cooWMTS,this.getZoomAncestor(tile,layer),pitch);
                       }

                       promises.push(this.getColorTexture(cooWMTS,pitch,layerWMTSId[i]));
                    }
                }
            }

            if (promises.length)
                return when.all(promises);
            else
                return when();

       };

       return WMTS_Provider;

    });
