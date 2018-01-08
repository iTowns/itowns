/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */

import * as THREE from 'three';
import Extent from '../../Geographic/Extent';
import OGCWebServiceHelper from './OGCWebServiceHelper';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 */
function WMS_Provider() {
}

WMS_Provider.prototype.url = function url(bbox, layer) {
    const box = bbox.as(layer.projection);
    const w = box.west();
    const s = box.south();
    const e = box.east();
    const n = box.north();

    const bboxInUnit = layer.axisOrder === 'swne' ?
        `${s},${w},${n},${e}` :
        `${w},${s},${e},${n}`;

    return layer.customUrl.replace('%bbox', bboxInUnit);
};

WMS_Provider.prototype.tileTextureCount = function tileTextureCount(tile, layer) {
    return tile.extent.crs() == layer.projection ? 1 : tile.getCoordsForLayer(layer).length;
};

WMS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.name) {
        throw new Error('layer.name is required.');
    }
    if (!layer.extent) {
        throw new Error('layer.extent is required');
    }
    if (!layer.projection) {
        throw new Error('layer.projection is required');
    }

    if (!(layer.extent instanceof Extent)) {
        layer.extent = new Extent(layer.projection, layer.extent);
    }

    if (!layer.options.zoom) {
        layer.options.zoom = { min: 0, max: 21 };
    }

    layer.format = layer.options.mimetype || 'image/png';
    layer.width = layer.heightMapWidth || 256;
    layer.version = layer.version || '1.3.0';
    layer.style = layer.style || '';
    layer.transparent = layer.transparent || false;

    if (!layer.axisOrder) {
        // 4326 (lat/long) axis order depends on the WMS version used
        if (layer.projection == 'EPSG:4326') {
            // EPSG 4326 x = lat, long = y
            // version 1.1.0 long/lat while version 1.3.0 mandates xy (so lat,long)
            layer.axisOrder = (layer.version === '1.1.0' ? 'wsen' : 'swne');
        } else {
            // xy,xy order
            layer.axisOrder = 'wsen';
        }
    }
    let crsPropName = 'SRS';
    if (layer.version === '1.3.0') {
        crsPropName = 'CRS';
    }

    layer.customUrl = `${layer.url
                  }?SERVICE=WMS&REQUEST=GetMap&LAYERS=${layer.name
                  }&VERSION=${layer.version
                  }&STYLES=${layer.style
                  }&FORMAT=${layer.format
                  }&TRANSPARENT=${layer.transparent
                  }&BBOX=%bbox` +
                  `&${crsPropName}=${layer.projection
                  }&WIDTH=${layer.width
                  }&HEIGHT=${layer.width}`;
};

WMS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    return tile.level >= layer.options.zoom.min &&
        tile.level <= layer.options.zoom.max &&
        layer.extent.intersectsExtent(tile.extent);
};

WMS_Provider.prototype.getColorTexture = function getColorTexture(tile, layer, targetLevel, tileCoords) {
    if (!this.tileInsideLimit(tile, layer)) {
        return Promise.reject(`Tile '${tile}' is outside layer bbox ${layer.extent}`);
    }
    if (tile.material === null) {
        return Promise.resolve();
    }

    let extent = tileCoords ? tileCoords.as(layer.projection) : tile.extent;
    // if no specific level requester, use tile.level
    if (targetLevel === undefined) {
        targetLevel = tile.level;
    } else if (!tileCoords) {
        let parentAtLevel = tile;
        while (parentAtLevel && parentAtLevel.level > targetLevel) {
            parentAtLevel = parentAtLevel.parent;
        }
        if (!parentAtLevel) {
            return Promise.reject(`Invalid targetLevel requested ${targetLevel}`);
        }
        extent = parentAtLevel.extent;
        targetLevel = parentAtLevel.level;
    }

    const coords = extent.as(layer.projection);
    const url = this.url(coords, layer);
    const pitch = tileCoords ? new THREE.Vector4(0, 0, 1, 1) : tile.extent.offsetToParent(extent);
    const result = { pitch };

    return OGCWebServiceHelper.getColorTextureByUrl(url, layer.networkOptions).then((texture) => {
        result.texture = texture;
        result.texture.extent = extent;
        if (layer.transparent) {
            texture.premultiplyAlpha = true;
        }
        if (tileCoords) {
            result.texture.coords = tileCoords;
        } else {
            result.texture.coords = coords;
            // LayeredMaterial expects coords.zoom to exist, and describe the
            // precision of the texture (a la WMTS).
            result.texture.coords.zoom = targetLevel;
        }
        return result;
    });
};

WMS_Provider.prototype.executeCommand = function executeCommand(command) {
    const tile = command.requester;

    const layer = command.layer;
    const getTextureFunction = tile.extent.crs() == layer.projection ? this.getColorTexture : this.getColorTextures;
    const supportedFormats = {
        'image/png': getTextureFunction.bind(this),
        'image/jpg': getTextureFunction.bind(this),
        'image/jpeg': getTextureFunction.bind(this),
    };

    const func = supportedFormats[layer.format];

    if (func) {
        return func(tile, layer, command.targetLevel);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

// In the case where the tilematrixset of the tile don't correspond to the projection of the layer
// when the projection of the layer corresponds to a tilematrixset inside the tile, like the PM
WMS_Provider.prototype.getColorTextures = function getColorTextures(tile, layer, targetLevel) {
    if (tile.material === null) {
        return Promise.resolve();
    }
    const promises = [];
    for (const coord of tile.getCoordsForLayer(layer)) {
        promises.push(this.getColorTexture(tile, layer, targetLevel, coord));
    }

    return Promise.all(promises);
};

export default WMS_Provider;
