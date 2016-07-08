/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */


define('Core/Commander/Providers/WMS_Provider', [
        'Core/Commander/Providers/Provider',
        'Core/Commander/Providers/IoDriver_XBIL',
        'Core/Commander/Providers/IoDriver_Image',
        'Core/Commander/Providers/IoDriverXML',
        'when',
        'Core/defaultValue',
        'THREE',
        'Core/Commander/Providers/CacheRessource',
        'Core/Math/Rectangle'
    ],
    function(
        Provider,
        IoDriver_XBIL,
        IoDriver_Image,
        IoDriverXML,
        when,
        defaultValue,
        THREE,
        CacheRessource,
        Rectangle) {

        /**
         * Return url wmts MNT
         * @param {String} options.url: service base url
         * @param {String} options.layer: requested data layer
         * @param {String} options.format: image format (default: format/jpeg)
         * @returns {Object@call;create.url.url|String}
         */
        function WMS_Provider(options) {
            //Constructor

            Provider.call(this, new IoDriver_XBIL());
            this.cache = CacheRessource();
            this.ioDriverImage = new IoDriver_Image();
            this.ioDriverXML = new IoDriverXML();

            this.layersData = {};

            this._ready       = false;
        }

        WMS_Provider.prototype = Object.create(Provider.prototype);

        WMS_Provider.prototype.constructor = WMS_Provider;

        WMS_Provider.prototype.url = function(bbox,layerId) {

            return this.customUrl(this.layersData[layerId].customUrl,bbox);

        };
        WMS_Provider.prototype.customUrl = function(url,coord)
        {

            //convert radian to degree, lon is added a offset of Pi
            //to align axis to card center
            //var bbox = (coord.minCarto.longitude - Math.PI)* 180 / Math.PI + "," + coord.minCarto.latitude* 180 / Math.PI + "," +
            //           (coord.maxCarto.longitude - Math.PI )*180/ Math.PI + "," + coord.maxCarto.latitude* 180 / Math.PI;

            var bbox = coord.minCarto.latitude* 180 / Math.PI + "," + (coord.minCarto.longitude - Math.PI)* 180 / Math.PI + "," +
                       coord.maxCarto.latitude* 180 / Math.PI + "," + (coord.maxCarto.longitude - Math.PI )*180/ Math.PI;
            var urld = url.replace('%bbox',bbox.toString());

            return urld;

        };

        WMS_Provider.prototype.removeLayer = function(idLayer)
        {
            if(this.layersData[idLayer])
                this.layersData[idLayer] = undefined;

        };

        WMS_Provider.prototype.addLayer = function(layer){
            if(!layer.name)
                throw new Error('layerName is required.');

            var baseUrl = layer.url,
                layerName = layer.name,
                format = defaultValue(layer.mimeType, "image/png"),
                crs = defaultValue(layer.projection, "EPSG:4326"),
                width = defaultValue(layer.heightMapWidth, 256),
                version = defaultValue(layer.version, "1.3.0"),
                styleName = defaultValue(layer.style, "normal"),
                transparent = defaultValue(layer.transparent, false),
                bbox = defaultValue(layer.bbox, [-180, -90, 180, 90]);

            var newBaseUrl =   baseUrl +
                          '?SERVICE=WMS&REQUEST=GetMap&LAYERS=' + layerName +
                          '&VERSION=' + version +
                          '&STYLES=' + styleName +
                          '&FORMAT=' + format +
                          '&TRANSPARENT=' + transparent +
                          '&BBOX=%bbox'  +
                          '&CRS=' + crs +
                          "&WIDTH=" + width +
                          "&HEIGHT=" + width;


                this.layersData[layer.id] = {
                    customUrl: newBaseUrl,
                    mimetype :  format,
                    crs :   crs,
                    width  : width,
                    version : version,
                    styleName : styleName,
                    transparent : transparent,
                    bbox    : bbox,
                    fx : layer.fx || 0.0,
                    tileMatrixSet: 'WGS84G' //cet option pour prendre le parcours de wmts
                };
        };

        WMS_Provider.prototype.executeCommand = function(){
            //console.log("executeCommandWMS");
        };

        WMS_Provider.prototype.tileInsideLimit = function(tile,layer) {

            var bbox = tile.bbox;

            var rectTile = new Rectangle({  west:bbox.minCarto.longitude,
                                            east:bbox.maxCarto.longitude,
                                            south:bbox.minCarto.latitude,
                                            north:bbox.maxCarto.latitude});

            //a reason that i add Pi here is because
            //bbox of wms reference to center of map
            //but bbox of itown reference to middle of left side.
            var west =  layer.bbox[0]*Math.PI/180 + Math.PI;
            var east =  layer.bbox[2]*Math.PI/180 + Math.PI;

            var rectRegion = new Rectangle({west: west,
                                            east: east,
                                            south:layer.bbox[1]*Math.PI/180,
                                            north:layer.bbox[3]*Math.PI/180});

            console.log(rectRegion.contains(rectTile),rectTile,rectRegion);

            return rectRegion.contains(rectTile);
        };

        WMS_Provider.prototype.getColorTextures = function(tile, layerWMSId) {

            var promises = [];

            if (tile.material === null) {
                return when();
            }
console.log(layerWMSId
        );
            for (var i = 0; i < layerWMSId.length; i++) {

                var layer = this.layersData[layerWMSId[i]];

                if (this.tileInsideLimit(tile,layer))
                {
                    var bbox = tile.bbox;
                    promises.push(this.getColorTexture(bbox,layerWMSId[i]));
                }
            }

            if (promises.length)
                return when.all(promises);
            else
                return when();

       };



       WMS_Provider.prototype.getColorTexture = function(bbox, layerId) {

            //ATTENTION: pitch???
            var result = {pitch : 1};

            var url = this.url(bbox,layerId);

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

        WMS_Provider.prototype.executeCommand = function(command){

            var tile = command.requester;
            return this.getColorTextures(tile,command.paramsFunction.layer.services).then(function(result)
            {
                    this.setTexturesLayer(result,1);
            }.bind(tile));

        };


        /**
         * Return url wms IR coverage
         * ex url: http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=1024&height=512
         * We can also specify time of coverage image like &time=2016-02-12+10:42
         * @param {type} coWMS
         * @returns {Object@call;create.urlOrtho.url|String}
         */
        WMS_Provider.prototype.urlGlobalIR = function(coWMS) {
            var latBound = coWMS.latBound || new THREE.Vector2(-85, 85);
            var longBound = coWMS.longBound || new THREE.Vector2(-178, 178);

            var width = coWMS.width || 1024;
            var height = coWMS.height || 512;

            var urlBaseService = "http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=";

            // URL for all globe  IR imagery
            var url = urlBaseService + latBound.x + "," + longBound.x + "," + latBound.y + "," + longBound.y +
                "&width=" + width + "&height=" + height;


            //"http://realearth.ssec.wisc.edu/api/image?products=globalir_20160212_080000&"+
            //"x="+coWMS.col+"&y="+coWMS.row+"&z=" + coWMS.zoom;
            return url;


        };

                /**
         * Returns the url for a WMS query with the specified bounding box
         * @param {BoundingBox} bbox: requested bounding box
         * @returns {Object@call;create.url.url|String}
         */
        WMS_Provider.prototype.urlClouds = function(bbox) {
            var url = this.baseUrl + "?LAYERS=" + this.layer + "&FORMAT=" + this.format +
                "&SERVICE=WMS&VERSION=1.1.1" + "&REQUEST=GetMap&BBOX=" +
                bbox.minCarto.longitude + "," + bbox.minCarto.latitude + "," +
                bbox.maxCarto.longitude + "," + bbox.maxCarto.latitude +
                "&WIDTH=" + this.width + "&HEIGHT=" + this.height + "&SRS=" + this.srs;
            return url;
        };


        /**
         * Returns a texture from the WMS stream with the specified bounding box
         * @param {BoundingBox} bbox: requested bounding box
         * @returns {WMS_Provider_L15.WMS_Provider.prototype@pro;_IoDriver@call;read@call;then}
         */
        WMS_Provider.prototype.getTexture = function(bbox) {

            if (bbox === undefined)
                return when(-2);

            var url = this.url(bbox);

            var textureCache = this.cache.getRessource(url);

            if (textureCache !== undefined)
                return when(textureCache);
            return this.ioDriverImage.read(url).then(function(image) {
                var result = {};
                result.texture = new THREE.Texture(image);
                result.texture.generateMipmaps = false;
                result.texture.magFilter = THREE.LinearFilter;
                result.texture.minFilter = THREE.LinearFilter;
                result.texture.anisotropy = 16;

                this.cache.addRessource(url, result.texture);
                return result.texture;

            }.bind(this));
        };

        return WMS_Provider;

    });
