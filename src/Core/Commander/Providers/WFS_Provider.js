/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import Provider         from 'Core/Commander/Providers/Provider';
import IoDriver_JSON    from 'Core/Commander/Providers/IoDriver_JSON';
import IoDriverXML      from 'Core/Commander/Providers/IoDriverXML';
import defaultValue     from 'Core/defaultValue';
import Projection       from 'Core/Geographic/Projection';
import CacheRessource   from 'Core/Commander/Providers/CacheRessource';
import BoundingBox      from 'Scene/BoundingBox';
import FeatureToolBox   from 'Renderer/ThreeExtented/FeatureToolBox.js'
//import ItownsLine from 'Core/Commander/Providers/ItownsLine';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function WFS_Provider(/*options*/) {
    Provider.call(this, new IoDriver_JSON());
    this.cache          = CacheRessource();
    this.ioDriverXML    = new IoDriverXML();
    this.projection     = new Projection();
    this.tool           = new FeatureToolBox();
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function(bbox, layer) {
    return this.customUrl(layer.customUrl, bbox);
};

WFS_Provider.prototype.tmpUrl = function(coord, layer){
    var bbox =  coord.south() * 180.0 / Math.PI + "," +
                coord.west()  * 180.0 / Math.PI + "," +
                coord.north() * 180.0 / Math.PI + "," +
                coord.east()  * 180.0 / Math.PI;

    var urld = layer.customUrl.replace('%bbox', bbox.toString());
    return urld;
};

WFS_Provider.prototype.customUrl = function(url,coord) {
    //convert radian to degree, lon is added a offset of Pi
    //to align axisgit  to card center
    var bbox =  coord.west()  * 180.0 / Math.PI + "," +
                coord.south() * 180.0 / Math.PI + "," +
                coord.east()  * 180.0 / Math.PI +  "," +
                coord.north() * 180.0 / Math.PI;

    var urld = url.replace('%bbox',bbox.toString());
    return urld;
};

WFS_Provider.prototype.preprocessDataLayer = function(layer){
    if(!layer.title)
        throw new Error('layerName is required.');

    layer.format    = defaultValue(layer.options.mimetype, "json"),
    layer.crs       = defaultValue(layer.projection, "EPSG:4326"),
    layer.version   = defaultValue(layer.version, "1.3.0"),
    layer.bbox      = defaultValue(layer.bbox, [-180, -90, 90, 180]);
    layer.customUrl = layer.url +
                      'SERVICE=WFS&REQUEST=GetFeature&typeName=' + layer.title +
                      '&VERSION=' + layer.version +
                      '&outputFormat=' + layer.format +
                      '&BBOX=%bbox,' + layer.crs;
};

WFS_Provider.prototype.tileInsideLimit = function(tile,layer) {
    var west =  layer.bbox[0] * Math.PI/180.0;
    var east =  layer.bbox[2] * Math.PI/180.0;
    var bboxRegion = new BoundingBox(west, east, layer.bbox[1]*Math.PI/180.0, layer.bbox[3]*Math.PI/180.0, 0, 0, 0);

    return (tile.level == (layer.params.level || 18)) && bboxRegion.intersect(tile.bbox);
};

WFS_Provider.prototype.executeCommand = function(command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    //TODO : support xml, gml2, geojson
    var supportedFormats = {
        json:    this.tool.getFeatures.bind(this),
        geojson: this.tool.getFeatures.bind(this)
    };

    var func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer, command.paramsFunction, command.requester).then(function(result) {
            return command.resolve(result);
        });
    } else {
        return Promise.reject(new Error('Unsupported mimetype ' + layer.format));
    }
};

export default WFS_Provider;
