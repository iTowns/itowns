/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */


import Provider from 'Core/Commander/Providers/Provider';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import defaultValue from 'Core/defaultValue';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function WFS_Provider(options) {
    this.cache = CacheRessource();
    this.baseUrl = options.url || '';
    this.layer = options.layer || '';
    this.typename = options.typename || '';
    this.format = defaultValue(options.format, 'json');
    this.epsgCode = options.epsgCode || 4326;
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
WFS_Provider.prototype.url = function (bbox) {
    var url = `${this.baseUrl
        }SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature` +
        `&typeName=${this.typename}&BBOX=${
        bbox.west()},${bbox.south()},${
        bbox.east()},${bbox.north()
        },epsg:${this.epsgCode}&outputFormat=${this.format}`;

    return url;
};

/*
 * Return Data as Object (JSON parsed)
 */
WFS_Provider.prototype.getData = function (bbox) {
    var url = this.url(bbox);
    return Fetcher.json(url);
};


export default WFS_Provider;
