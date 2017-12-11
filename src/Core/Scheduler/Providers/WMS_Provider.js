/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */

import * as THREE from 'three';
import Extent from '../../Geographic/Extent';
import OGCWebServiceHelper from './OGCWebServiceHelper';

const supportedFormats = ['image/png', 'image/jpg', 'image/jpeg'];

function url(bbox, layer) {
    const box = bbox.as(layer.projection);
    const w = box.west();
    const s = box.south();
    const e = box.east();
    const n = box.north();

    const bboxInUnit = layer.axisOrder === 'swne' ?
        `${s},${w},${n},${e}` :
        `${w},${s},${e},${n}`;

    return layer.customUrl.replace('%bbox', bboxInUnit);
}

function tileTextureCount(tile, layer) {
    return tile.extent.crs() == layer.projection ? 1 : tile.getCoordsForLayer(layer).length;
}

function preprocessDataLayer(layer) {
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

    layer.format = layer.format || 'image/png';
    if (!supportedFormats.includes(layer.format)) {
        throw new Error(`Layer ${layer.name}: unsupported format '${layer.format}', should be one of '${supportedFormats.join('\', \'')}'`);
    }

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
}

function tileInsideLimit(tile, layer) {
    return tile.level >= layer.options.zoom.min &&
        tile.level <= layer.options.zoom.max &&
        layer.extent.intersectsExtent(tile.extent);
}

function getColorTexture(tile, layer, targetLevel, tileCoords) {
    if (!tileInsideLimit(tile, layer)) {
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
    const urld = url(coords, layer);
    const pitch = tileCoords ? new THREE.Vector4(0, 0, 1, 1) : tile.extent.offsetToParent(extent);
    const result = { pitch };

    return OGCWebServiceHelper.getColorTextureByUrl(urld, layer.networkOptions).then((texture) => {
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
}

function executeCommand(command) {
    const tile = command.requester;

    const layer = command.layer;
    const getTextureFunction = tile.extent.crs() == layer.projection ? getColorTexture : getColorTextures;

    return getTextureFunction(tile, layer, command.targetLevel);
}

// In the case where the tilematrixset of the tile don't correspond to the projection of the layer
// when the projection of the layer corresponds to a tilematrixset inside the tile, like the PM
function getColorTextures(tile, layer, targetLevel) {
    if (tile.material === null) {
        return Promise.resolve();
    }
    const promises = [];
    for (const coord of tile.getCoordsForLayer(layer)) {
        promises.push(getColorTexture(tile, layer, targetLevel, coord));
    }

    return Promise.all(promises);
}

export default {
    preprocessDataLayer,
    executeCommand,
    tileTextureCount,
    tileInsideLimit,
};
