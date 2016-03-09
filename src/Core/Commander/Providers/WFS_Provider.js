/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */


define('Core/Commander/Providers/WFS_Provider', [
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
        function WFS_Provider(options) {
            //Constructor

           // Provider.call(this, new IoDriver_XBIL());
            this.cache = CacheRessource();
            this.ioDriverImage = new IoDriver_Image();
            this.ioDriverXML = new IoDriverXML();

            this.baseUrl = options.url || "";
            this.layer = options.layer || "";
            this.format = defaultValue(options.format, "image/jpeg");
            this.srs = options.srs || "";
            this.width = defaultValue(options.width, 256);
            this.height = defaultValue(options.height, 256);
        }

        WFS_Provider.prototype = Object.create(Provider.prototype);

        WFS_Provider.prototype.constructor = WFS_Provider;


        /**
         * Returns the url for a WMS query with the specified bounding box
         * @param {BoundingBox} bbox: requested bounding box
         * @returns {Object@call;create.url.url|String}
         * ex http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?service=WFS&version=2.0.0
         * &REQUEST=GetFeature&typeName=BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie
         * &bbox=2.325,48.855,2.335,48.865,epsg:4326&outputFormat=json
         */
        WFS_Provider.prototype.url = function(bbox) {
            var url = this.baseUrl + "?LAYERS=" + this.layer + "&FORMAT=" + this.format +
                "&SERVICE=WMS&VERSION=1.1.1" + "&REQUEST=GetMap&BBOX=" +
                bbox.minCarto.longitude + "," + bbox.minCarto.latitude + "," +
                bbox.maxCarto.longitude + "," + bbox.maxCarto.latitude +
                "&WIDTH=" + this.width + "&HEIGHT=" + this.height + "&SRS=" + this.srs;
            return url;
        };




        return WFS_Provider;

    });
