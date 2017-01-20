/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import { UNIT } from 'Core/Geographic/GeoCoordinate';
import Provider from 'Core/Commander/Providers/Provider';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import BoundingBox from 'Scene/BoundingBox';
import FeatureToolBox from 'Renderer/ThreeExtended/FeatureToolBox';

function WFS_Provider() {
    this.cache = CacheRessource();
    this.batiments = [];
    this.pointOrder = new Map();
    this.featureToolBox = new FeatureToolBox();
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function url(coord, layer) {
    var bbox;
    if (layer.axisOrder == 'ordered')
        { bbox = `${coord.south(UNIT.DEGREE)},${coord.west(UNIT.DEGREE)},${
               coord.north(UNIT.DEGREE)},${coord.east(UNIT.DEGREE)}`; }
    else
        { bbox = `${coord.west(UNIT.DEGREE)},${coord.south(UNIT.DEGREE)},${
               coord.east(UNIT.DEGREE)},${coord.north(UNIT.DEGREE)}`; }
    return layer.customUrl.replace('%bbox', bbox.toString());
};

WFS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.title) {
        throw new Error('layerName is required.');
    }

    layer.format = layer.options.mimetype || 'json';
    layer.crs = layer.projection || 'EPSG:4326';
    layer.version = layer.version || '1.3.0';
    layer.bbox = layer.bbox || [-180, -90, 90, 180];
    layer.customUrl = `${layer.url
                      }SERVICE=WFS&REQUEST=GetFeature&typeName=${layer.title
                      }&VERSION=${layer.version
                      }&SRSNAME=${layer.crs
                      }&outputFormat=${layer.format
                      }&BBOX=%bbox,${layer.crs}`;
};

WFS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    const bbox = new BoundingBox(layer.bbox[0], layer.bbox[2], layer.bbox[1], layer.bbox[3], 0, 0, UNIT.DEGREE);

    return (tile.level === 16) && bbox.intersect(tile.bbox);
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
        return func(tile, layer, command).then(result => command.resolve(result));
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

function assignLayer(object, layer) {
    object.layers.set(layer);
    for (const c of object.children) {
        assignLayer(c, layer);
    }
}

WFS_Provider.prototype.getFeatures = function getFeatures(tile, layer, parameters) {
    if (!this.tileInsideLimit(tile, layer) || tile.material === null)
        { return Promise.resolve(); }

    const bbox = parameters.ancestor ? parameters.ancestor.bbox : tile.bbox;
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
                    result.feature = this.featureToolBox.GeoJSON2Polygon(layer.ellipsoid, features, pointOrder);
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
                        result.feature = this.featureToolBox.GeoJSON2Box(layer.ellipsoid, features, pointOrder);
                    }
                }
                else if (layer.type == 'point' || layer.type == 'box') {
                    result.feature = this.featureToolBox.GeoJSON2Point(layer.ellipsoid, features, bbox, layer, pointOrder);
                } else if (layer.type == 'line') {
                    result.feature = this.featureToolBox.GeoJSON2Line(layer.ellipsoid, features, bbox, layer, pointOrder);
                } else {
                    return result;
                }

                if (result.feature !== undefined) {
                    // Is needed to do another request for the retail level change
                    if (result.feature.layer == null)
                        { result.feature.layer = layer; }
                    this.cache.addRessource(url, result.feature);
                }

                assignLayer(result.feature, parameters.threejsLayer);
                return result;
            }
        }
    });

    // .catch((/* reason*/) => {
    //     result.feature = null;
    //     return result;
    // });
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
