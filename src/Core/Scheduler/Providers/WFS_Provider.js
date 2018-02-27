/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import Extent from '../../Geographic/Extent';
import Fetcher from './Fetcher';
import CacheRessource from './CacheRessource';
import GeoJSON2Features from '../../../Renderer/ThreeExtended/GeoJSON2Features';
import Feature2Mesh from '../../../Renderer/ThreeExtended/Feature2Mesh';

const cache = CacheRessource();

function url(bbox, layer) {
    const box = bbox.as(layer.projection);
    const w = box.west();
    const s = box.south();
    const e = box.east();
    const n = box.north();

    // TODO: use getPointOrder
    const bboxInUnit = `${w},${s},${e},${n}`;

    return layer.customUrl.replace('%bbox', bboxInUnit);
}

function preprocessDataLayer(layer) {
    if (!layer.typeName) {
        throw new Error('layer.typeName is required.');
    }
    layer.format = layer.options.mimetype || 'json';
    layer.crs = layer.projection || 'EPSG:4326';
    layer.version = layer.version || '2.0.2';
    layer.opacity = layer.opacity || 1;
    layer.wireframe = layer.wireframe || false;
    if (!(layer.extent instanceof Extent)) {
        layer.extent = new Extent(layer.projection, layer.extent);
    }
    layer.customUrl = `${layer.url
                      }SERVICE=WFS&REQUEST=GetFeature&typeName=${layer.typeName
                      }&VERSION=${layer.version
                      }&SRSNAME=${layer.crs
                      }&outputFormat=${layer.format
                      }&BBOX=%bbox,${layer.crs}`;
}

function tileInsideLimit(tile, layer) {
    return (layer.level === undefined || tile.level === layer.level) && layer.extent.intersectsExtent(tile.extent);
}

function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;
    const destinationCrs = command.view.referenceCrs;

    // TODO : support xml, gml2
    const supportedFormats = {
        json: getFeatures,
        geojson: getFeatures,
    };

    const func = supportedFormats[layer.format];
    if (func) {
        return func(destinationCrs, tile, layer, command).then(result => command.resolve(result));
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
}

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

function getFeatures(crs, tile, layer) {
    if (!layer.tileInsideLimit(tile, layer) || tile.material === null) {
        return Promise.resolve();
    }

    const urld = url(tile.extent.as(layer.crs), layer);
    const result = {};

    result.feature = cache.getRessource(url);

    if (result.feature !== undefined) {
        return Promise.resolve(result);
    }

    layer.convert = layer.convert ? layer.convert : Feature2Mesh.convert({});

    return Fetcher.json(urld, layer.networkOptions).then(geojson => assignLayer(layer.convert(GeoJSON2Features.parse(crs, geojson, tile.extent, { filter: layer.filter })), layer));
}

export default {
    preprocessDataLayer,
    executeCommand,
    tileInsideLimit,
};
