/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import * as THREE from 'three';
import { UNIT } from 'Core/Geographic/GeoCoordinate';
import FeatureMesh from 'Renderer/FeatureMesh';
import Provider from 'Core/Commander/Providers/Provider';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import BoundingBox from 'Scene/BoundingBox';
import FeatureToolBox from 'Renderer/ThreeExtented/FeatureToolBox';
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
var tool = new FeatureToolBox();
var projection = new Projection();
function WFS_Provider(/* options*/) {
    this.cache = CacheRessource();
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function (coord, layer) {
    var bbox;
    if (layer.axisOrder == 'ordered')
        { bbox = `${coord.south(UNIT.DEGREE)},${coord.west(UNIT.DEGREE)},${
               coord.north(UNIT.DEGREE)},${coord.east(UNIT.DEGREE)}`; }
    else
        { bbox = `${coord.west(UNIT.DEGREE)},${coord.south(UNIT.DEGREE)},${
               coord.east(UNIT.DEGREE)},${coord.north(UNIT.DEGREE)}`; }
    var urld = layer.customUrl.replace('%bbox', bbox.toString());
    return urld;
};

WFS_Provider.prototype.preprocessDataLayer = function (layer) {
    if (!layer.title)
        { throw new Error('layerName is required.'); }

    layer.format = defaultValue(layer.options.mimetype, 'json');
    layer.crs = defaultValue(layer.projection, 'EPSG:4326');
    layer.version = defaultValue(layer.version, '1.3.0');
    layer.bbox = defaultValue(layer.bbox, [-180, -90, 90, 180]);
    layer.customUrl = `${layer.url
                      }SERVICE=WFS&REQUEST=GetFeature&typeName=${layer.title
                      }&VERSION=${layer.version
                      }&SRSNAME=${layer.crs
                      }&outputFormat=${layer.format
                      }&BBOX=%bbox,${layer.crs}`;
};

WFS_Provider.prototype.tileInsideLimit = function (tile, layer) {
    var bbox = new BoundingBox(layer.bbox[0], layer.bbox[2], layer.bbox[1], layer.bbox[3], 0, 0, UNIT.DEGREE);

    return (tile.level >= 16) && bbox.intersect(tile.bbox);
};

WFS_Provider.prototype.executeCommand = function (command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    // TODO : support xml, gml2, geojson
    var supportedFormats = {
        json: this.getFeatures.bind(this),
        geojson: this.getFeatures.bind(this),
    };

    var func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer, command.paramsFunction).then(result => command.resolve(result));
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

var builder = new BuilderEllipsoidTile(tool.ellipsoid, projection);
WFS_Provider.prototype.getFeatures = function (tile, layer, parameters) {
    if (!this.tileInsideLimit(tile, layer) || tile.material === null)
        { return Promise.resolve(); }

    var pitch = parameters.ancestor ?
                this.projection.WMS_WGS84Parent(tile.bbox, parameters.ancestor.bbox) :
                new THREE.Vector3(0, 0, 1);
    var bbox = parameters.ancestor ?
                parameters.ancestor.bbox :
                tile.bbox;

    var url = this.url(bbox, layer);

    var result = { pitch };
    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined) {
        return Promise.resolve(result);
    }
    return Fetcher.json(url).then((feature) => {
        if (feature.crs || layer.crs) {
            var pointOrder = this.CheckOutputType(feature.crs);
            if (pointOrder != undefined) {
                const features = feature.features;
                if (layer.type == 'poly')
                    { result.feature = tool.GeoJSON2Polygon(features, pointOrder); }
                else if (layer.type == 'bbox')
                    { result.feature = tool.GeoJSON2Box(features, pointOrder); }
                else {
                    const mesh = new FeatureMesh({ bbox }, builder);
                    if (layer.type == 'point' || layer.type == 'box')
                        { tool.GeoJSON2Point(features, bbox, layer, pointOrder, mesh.geometry); }
                    else if (layer.type == 'line')
                        { tool.GeoJSON2Line(features, bbox, layer, pointOrder, mesh.geometry); }
                    else
                        { return result; }
                    result.feature = mesh;
                }

                if (result.feature !== undefined) {
                    // Is needed to do another request for the retail level change
                    if (result.feature.layer == null)
                        { result.feature.layer = layer; }
                    this.cache.addRessource(url, result.feature);
                }
                return result;
            }
        }
    }).catch((/* reason*/) => {
        result.feature = null;
        return result;
    });
};

WFS_Provider.prototype.CheckOutputType = function (crs) {
    var pointOrder = {
        lat: 0,
        long: 1,
    };
    if (crs.type == 'EPSG' && crs.properties.code == '4326') {
        pointOrder.long = 0;
        pointOrder.lat = 1;
        return pointOrder;
    }
    else if (crs.type == 'name') {
        if (crs.properties.name) {
            var regExpEpsg = new RegExp(/^urn:[x-]?ogc:def:crs:EPSG:(\d*.?\d*)?:\d{4}/);
            if (regExpEpsg.test(crs.properties.name))
                { return pointOrder; }
            else {
                var regExpOgc = new RegExp(/^urn:[x-]?ogc:def:crs:OGC:(\d*.?\d*)?:(CRS)?(WSG)?\d{0,2}/);
                if (regExpOgc.test(crs.properties.name)) {
                    pointOrder.long = 0;
                    pointOrder.lat = 1;
                    return pointOrder;
                } else
                    { return undefined; }
            }
        } else
            { return undefined; }
    } else
        { return undefined; }
};

export default WFS_Provider;
