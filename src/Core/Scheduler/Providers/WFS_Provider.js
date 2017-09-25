/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import Extent from '../../Geographic/Extent';
import Provider from './Provider';
import Fetcher from './Fetcher';
import CacheRessource from './CacheRessource';
import GeoJSON2Feature from '../../../Renderer/ThreeExtended/GeoJSON2Feature';
import Feature2Mesh from '../../../Renderer/ThreeExtended/Feature2Mesh';

function WFS_Provider() {
    this.cache = CacheRessource();
    this.pointOrder = new Map();
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function url(bbox, layer) {
    const box = bbox.as(layer.projection);
    const w = box.west();
    const s = box.south();
    const e = box.east();
    const n = box.north();

    // TODO: use getPointOrder
    const bboxInUnit = `${w},${s},${e},${n}`;

    return layer.customUrl.replace('%bbox', bboxInUnit);
};

WFS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.typeName) {
        throw new Error('layer.typeName is required.');
    }

    layer.format = layer.options.mimetype || 'json';
    layer.crs = layer.projection || 'EPSG:4326';
    layer.version = layer.version || '2.0.2';
    if (!(layer.extent instanceof Extent)) {
        layer.extent = new Extent(layer.projection, layer.extent);
    }
    layer.customUrl = `${layer.url
                      }SERVICE=WFS&REQUEST=GetFeature&typeName=${layer.typeName
                      }&VERSION=${layer.version
                      }&SRSNAME=${layer.crs
                      }&outputFormat=${layer.format
                      }&BBOX=%bbox,${layer.crs}`;
};

WFS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    return (layer.level === undefined || tile.level === layer.level) && layer.extent.intersectsExtent(tile.extent);
};

WFS_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;
    const destinationCrs = command.view.referenceCrs;

    // TODO : support xml, gml2
    const supportedFormats = {
        json: this.getFeatures.bind(this),
        geojson: this.getFeatures.bind(this),
    };

    const func = supportedFormats[layer.format];
    if (func) {
        return func(destinationCrs, tile, layer, command).then(result => command.resolve(result)).catch((error) => {
            // eslint-disable-next-line no-console
            console.error(error.stack);
        });
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

function assignLayer(object, layer) {
    if (object) {
        object.layer = layer.id;
        object.layers.set(layer.threejsLayer);
        for (const c of object.children) {
            assignLayer(c, layer);
        }
        return object;
    }
}

WFS_Provider.prototype.getFeatures = function getFeatures(crs, tile, layer) {
    if (!layer.tileInsideLimit(tile, layer) || tile.material === null) {
        return Promise.resolve();
    }

    const url = this.url(tile.extent.as(layer.crs), layer);
    const result = {};

    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined) {
        return Promise.resolve(result);
    }
    return Fetcher.json(url, layer.networkOptions).then(geojson => assignLayer(Feature2Mesh.convert(GeoJSON2Feature.parse(crs, geojson, tile.extent), layer.style), layer));
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
