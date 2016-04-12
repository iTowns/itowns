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
        'Core/Commander/Providers/CacheRessource'
    ],
    function(
        Provider,
        IoDriver_XBIL,
        IoDriver_Image,
        IoDriverXML,
        when,
        defaultValue,
        THREE,
        CacheRessource) {

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

            this.baseUrl = options.url || "";
            this.layer = options.layer || "";
            this.style = options.style || "";
            this.format = defaultValue(options.format, "image/jpeg");
            this.srs = options.srs || "";
            this.width = defaultValue(options.width, 256);
            this.height = defaultValue(options.height, 256);
        }

        WMS_Provider.prototype = Object.create(Provider.prototype);

        WMS_Provider.prototype.constructor = WMS_Provider;


        /**
         * Returns the url for a WMS query with the specified bounding box
         * @param {BoundingBox} bbox: requested bounding box
         * @returns {Object@call;create.url.url|String}
         */
        WMS_Provider.prototype.url = function(bbox) {
            var url = this.baseUrl + "?LAYERS=" + this.layer + "&FORMAT=" + this.format +
                "&SERVICE=WMS&VERSION=1.1.1" + "&REQUEST=GetMap&BBOX=" +
                bbox.minCarto.longitude + "," + bbox.minCarto.latitude + "," +
                bbox.maxCarto.longitude + "," + bbox.maxCarto.latitude +
                "&WIDTH=" + this.width + "&HEIGHT=" + this.height + "&SRS=" + this.srs +
                "&STYLES=";
            return url;
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
                result.texture.needsUpdate = true;
                result.texture.url = url;

                this.cache.addRessource(url, result.texture);
                return result.texture;

            }.bind(this));
        };

        return WMS_Provider;

    });
