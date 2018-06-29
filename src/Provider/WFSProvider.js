/**
 * Generated On: 2016-03-5
 * Class: WFSProvider
 * Description: Provides data from a WFS stream
 */

import Extent from '../Core/Geographic/Extent';
import URLBuilder from './URLBuilder';
import Fetcher from './Fetcher';
import Cache from '../Core/Scheduler/Cache';
import GeoJsonParser from '../Parser/GeoJsonParser';
import feature2Mesh from '../Transform/feature2Mesh';

function preprocessDataLayer(layer) {
    if (!layer.typeName) {
        throw new Error('layer.typeName is required.');
    }

    layer.format = layer.format || 'application/json';

    layer.crs = layer.projection || 'EPSG:4326';
    layer.version = layer.version || '2.0.2';
    layer.opacity = layer.opacity || 1;
    layer.wireframe = layer.wireframe || false;
    if (!(layer.extent instanceof Extent)) {
        layer.extent = new Extent(layer.projection, layer.extent);
    }
    layer.url = `${layer.url
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
    return getFeatures(destinationCrs, tile, layer, command).then(result => command.resolve(result));
}

function assignLayer(object, layer) {
    if (object) {
        object.layer = layer;
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

    const urld = URLBuilder.bbox(tile.extent.as(layer.crs), layer);

    layer.transform = layer.transform ? layer.transform : feature2Mesh;

    return (Cache.get(urld) || Cache.set(urld, Fetcher.json(urld, layer.networkOptions)))
        .then(
            geojson => GeoJsonParser.parse(geojson, { crsOut: crs, filteringExtent: tile.extent, filter: layer.filter }),
            (err) => {
                // special handling for 400 errors, as it probably means the config is wrong
                if (err.response.status == 400) {
                    return err.response.text().then((text) => {
                        const getCapUrl = `${layer.url}SERVICE=WFS&REQUEST=GetCapabilities&VERSION=${layer.version}`;
                        const xml = new DOMParser().parseFromString(text, 'application/xml');
                        const errorElem = xml.querySelector('Exception');
                        const errorCode = errorElem.getAttribute('exceptionCode');
                        const errorMessage = errorElem.querySelector('ExceptionText').textContent;
                        console.error(`Layer ${layer.name}: bad request when fetching data. Server says: "${errorCode}: ${errorMessage}". \nReviewing ${getCapUrl} may help.`, err);
                        throw err;
                    });
                } else {
                    console.error(`Layer ${layer.name}: ${err.response.status} error while trying to fetch WFS data. Url was ${urld}.`, err);
                    throw err;
                }
            })
        .then(feature => assignLayer(layer.transform(feature, layer.style), layer));
}

export default {
    preprocessDataLayer,
    executeCommand,
    tileInsideLimit,
};
