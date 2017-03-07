/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */


import Provider from './Provider';
import Fetcher from './Fetcher';
import CacheRessource from './CacheRessource';
import BoundingBox from '../../../Scene/BoundingBox';
import FeatureToolBox from '../../../Renderer/ThreeExtented/FeatureToolBox';
import NodeMesh from '../../../Renderer/NodeMesh';
import Layer from '../../../Scene/Layer';
import { UNIT } from '../../Geographic/Coordinates';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 * */

function WFS_Provider(options) {
    options = options || {};
    this.cache = CacheRessource();
    this.baseUrl = options.url || '';
    this.layer = options.layer || '';
    this.typename = options.typename || '';
    this.format = options.format === undefined ? 'json' : options.format;
    this.epsgCode = options.epsgCode || 4326;
    this.batiments = [];
    this.pointOrder = new Map();
    this.featureToolBox = new FeatureToolBox(options.ellipsoid);
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function url(coord, layer) {
    let bbox;
    if (layer.axisOrder == 'ordered') {
        bbox = `${coord.south(UNIT.DEGREE)},${coord.west(UNIT.DEGREE)},${
               coord.north(UNIT.DEGREE)},${coord.east(UNIT.DEGREE)}`;
    } else {
        bbox = `${coord.west(UNIT.DEGREE)},${coord.south(UNIT.DEGREE)},${
            coord.east(UNIT.DEGREE)},${coord.north(UNIT.DEGREE)}`;
    }
    return layer.customUrl.replace('%bbox', bbox.toString());
};

WFS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.title) {
        throw new Error('layerName is required.');
    }
    // if (!layer.projection) {
    //     throw new Error('projection is required');
    // }
    // if (!layer.bbox) {
    //     throw new Error('bbox is required');
    // }
    layer.projection = layer.projection || 'EPSG:4326';
    layer.bbox = layer.bbox || [-180, -90, 90, 180];
    layer.bbox = new BoundingBox(
        layer.projection,
        layer.bbox[0], layer.bbox[2],
        layer.bbox[1], layer.bbox[3]);

    layer.root = new NodeMesh();
    var featureLayer = new Layer();
    featureLayer.add(layer.root);
    layer.format = layer.options.mimetype || 'json';
    layer.crs = layer.projection;
    layer.version = layer.version || '1.3.0';
    layer.customUrl = `${layer.url
                      }SERVICE=WFS&REQUEST=GetFeature&typeName=${layer.title
                      }&VERSION=${layer.version
                      }&SRSNAME=${layer.crs
                      }&outputFormat=${layer.format
                      }&BBOX=%bbox,${layer.crs}`;
};

WFS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    return (tile.level === 16) && layer.bbox.intersect(tile.bbox);
};

WFS_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;

    // TODO : support xml, gml2
    const supportedFormats = {
        json: this.getFeatures.bind(this),
        geojson: this.getFeatures.bind(this),
    };

    const func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer).then(result => command.resolve(result));
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

WFS_Provider.prototype.getFeatures = function getFeatures(tile, layer) {
    if (!this.tileInsideLimit(tile, layer) || tile.material === null)
        { return Promise.resolve(); }

    const bbox = tile.bbox;
    const url = this.url(bbox, layer);
    const result = {};

    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined) {
        return Promise.resolve(result);
    }
    return Fetcher.json(url).then((feature) => {
        const crs = feature.crs || layer.crs;
        if (crs) {
            const pointOrder = this.getPointOrder(crs);
            if (pointOrder !== undefined) {
                const features = feature.features;
                if (layer.type == 'poly') {
                    result.feature = this.featureToolBox.GeoJSON2Polygon(features, pointOrder);
                } else if (layer.type == 'bbox') {
                    // remove duplicate batiments
                    for (let i = features.length - 1; i >= 0; i--) {
                        const idBat = Number(features[i].properties.id.split('BATIMENT')[1]);
                        if (this.batiments[idBat] === undefined) {
                            this.batiments[idBat] = true;
                        } else {
                            features.splice(i, 1);
                        }
                    }
                    if (features.length) {
                        result.feature = this.featureToolBox.GeoJSON2Box(features, pointOrder);
                    }
                }
                else if (layer.type == 'point' || layer.type == 'box') {
                    result.feature = this.featureToolBox.GeoJSON2Point(features, bbox, layer, pointOrder);
                } else if (layer.type == 'line') {
                    result.feature = this.featureToolBox.GeoJSON2Line(features, bbox, layer, pointOrder);
                } else {
                    return result;
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

WFS_Provider.prototype.getPointOrder = function getPointOrder(crs) {
    if (this.pointOrder[crs]) {
        return this.pointOrder[crs];
    }

    var pointOrder = { lat: 0, long: 1 };

    if (crs.type == 'EPSG' && crs.properties.code == '4326') {
        pointOrder.long = 0;
        pointOrder.lat = 1;
        return pointOrder;
    } else if (crs.type == 'name') {
        if (crs.properties.name) {
            var regExpEpsg = new RegExp(/^urn:[x-]?ogc:def:crs:EPSG:(\d*.?\d*)?:\d{4}/);
            if (regExpEpsg.test(crs.properties.name)) {
                return pointOrder;
            }
            else {
                var regExpOgc = new RegExp(/^urn:[x-]?ogc:def:crs:OGC:(\d*.?\d*)?:(CRS)?(WSG)?\d{0,2}/);
                if (regExpOgc.test(crs.properties.name)) {
                    pointOrder.long = 0;
                    pointOrder.lat = 1;
                    return pointOrder;
                }
            }
        }
    }
};

export default WFS_Provider;
