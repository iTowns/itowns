import * as THREE from 'three';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import URLBuilder from './URLBuilder';
import { STRATEGY_MIN_NETWORK_TRAFFIC, STRATEGY_PROGRESSIVE, STRATEGY_DICHOTOMY, STRATEGY_GROUP } from '../Core/Layer/LayerUpdateStrategy';

const supportedFormats = new Map([
    ['image/png', getColorTextures],
    ['image/jpg', getColorTextures],
    ['image/jpeg', getColorTextures],
    ['image/x-bil;bits=32', getXbilTexture],
]);

function preprocessDataLayer(layer) {
    layer.fx = layer.fx || 0.0;

    layer.format = layer.format || 'image/png';
    if (!supportedFormats.has(layer.format)) {
        throw new Error(
            `Layer ${layer.name}: unsupported layer.format '${layer.format}', must be one of '${Array.from(supportedFormats.keys()).join('\', \'')}'`);
    }

    if (layer.protocol === 'wmts') {
        const options = layer.options;
        options.version = options.version || '1.0.0';
        options.tileMatrixSet = options.tileMatrixSet || 'WGS84';
        options.style = options.style || 'normal';
        options.projection = options.projection || 'EPSG:3857';
        let newBaseUrl = `${layer.url}` +
            `?LAYER=${options.name}` +
            `&FORMAT=${layer.format}` +
            '&SERVICE=WMTS' +
            `&VERSION=${options.version}` +
            '&REQUEST=GetTile' +
            `&STYLE=${options.style}` +
            `&TILEMATRIXSET=${options.tileMatrixSet}`;

        newBaseUrl += '&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';

        if (!layer.options.zoom) {
            const arrayLimits = Object.keys(options.tileMatrixSetLimits);
            const size = arrayLimits.length;
            const maxZoom = Number(arrayLimits[size - 1]);
            const minZoom = maxZoom - size + 1;

            layer.options.zoom = {
                min: minZoom,
                max: maxZoom,
            };
        }
        layer.url = newBaseUrl;
    }
    layer.options.zoom = layer.options.zoom || { min: 2, max: 20 };
}

function canTextureBeImproved(layer, extents, textures, previousError) {
    for (const extent of extents) {
        if (!extentInsideLimit(extent, layer)) {
            return;
        }
        if (extent.zoom > layer.options.zoom.max) {
            return;
        }
    }

    if (!textures || textures.length < extents.length) {
        return selectAllExtentsToDownload(layer, extents, textures, previousError);
    }

    for (let i = 0; i < extents.length; i++) {
        if (!textures[i].extent || textures[i].extent.zoom < extents[i].zoom) {
            return selectAllExtentsToDownload(layer, extents, textures, previousError);
        }
    }
}

function selectAllExtentsToDownload(layer, extents, textures, previousError) {
    const result = [];
    for (let i = 0; i < extents.length; i++) {
        const pitch = new THREE.Vector4(0, 0, 1, 1);
        const extent = chooseExtentToDownload(extents[i], (textures && textures[i].extent) ? textures[i].extent : null, layer, pitch, previousError);
        // if the choice is the same as the current one => stop updating
        if (textures && textures[i].extent && textures[i].extent.zoom == extent.zoom) {
            return;
        }
        result.push({
            extent,
            pitch,
            url: URLBuilder.xyz(extent, layer),
        });
    }
    return result;
}

// Maps nodeLevel to groups defined in layer's options
// eg with groups = [3, 7, 12]:
//     * nodeLevel = 2 -> 3
//     * nodeLevel = 4 -> 3
//     * nodeLevel = 7 -> 7
//     * nodeLevel = 15 -> 12
function _group(nodeLevel, currentLevel, options) {
    var f = options.groups.filter(val => (val <= nodeLevel));
    return f.length ? f[f.length - 1] : options.groups[0];
}

export function chooseExtentToDownload(extent, currentExtent, layer, pitch, previousError) {
    if (layer.updateStrategy.type == STRATEGY_MIN_NETWORK_TRAFFIC) {
        return extent;
    }

    let nextZoom = 0;
    if (currentExtent) {
        if (extent.zoom <= (currentExtent.zoom + 1)) {
            return extent;
        }

        switch (layer.updateStrategy.type) {
            case STRATEGY_PROGRESSIVE:
                nextZoom += 1;
                break;
            case STRATEGY_GROUP:
                nextZoom = _group(extent.zoom, currentExtent.zoom, layer.updateStrategy.options);
                break;
            default:
            case STRATEGY_DICHOTOMY:
                nextZoom = Math.ceil((currentExtent.zoom + extent.zoom) / 2);
                break;
        }
    }

    if (previousError && previousError.extent && previousError.extent.zoom == nextZoom) {
        nextZoom = Math.ceil((currentExtent.zoom + nextZoom) / 2);
    }

    nextZoom = Math.min(
        Math.max(nextZoom, layer.options.zoom.min),
        layer.options.zoom.max);

    if (extent.zoom <= nextZoom) {
        return extent;
    }

    return OGCWebServiceHelper.WMTS_WGS84Parent(extent, nextZoom, pitch);
}

/*
 * return texture float alpha THREE.js of MNT
 */
function getXbilTexture(toDownload, layer) {
    return OGCWebServiceHelper.getXBilTextureByUrl(toDownload[0].url, layer.networkOptions).then((texture) => {
        texture.extent = toDownload[0].extent;
        return {
            texture,
            pitch: toDownload[0].pitch,
            min: !texture.min ? 0 : texture.min,
            max: !texture.max ? 0 : texture.max,
        };
    }, (err) => {
        err.extent = toDownload[0].extent;
        throw err;
    });
}

/*
 * Return texture RGBA THREE.js of orthophoto
 */
function getColorTexture(toDownload, layer) {
    return OGCWebServiceHelper.getColorTextureByUrl(toDownload.url, layer.networkOptions).then((texture) => {
        const result = {};
        result.texture = texture;
        result.texture.extent = toDownload.extent;
        result.pitch = toDownload.pitch;
        if (layer.transparent) {
            texture.premultiplyAlpha = true;
        }

        return result;
    }, (err) => {
        err.extent = toDownload.extent;
        throw err;
    });
}

function executeCommand(command) {
    const layer = command.layer;
    return supportedFormats.get(layer.format)(command.toDownload, layer);
}

function tileTextureCount(tile, layer) {
    const tileMatrixSet = layer.options.tileMatrixSet;
    OGCWebServiceHelper.computeTileMatrixSetCoordinates(tile, tileMatrixSet);
    return tile.getCoordsForLayer(layer).length;
}

function extentInsideLimit(extent, layer) {
    // This layer provides data starting at level = layer.options.zoom.min
    // (the zoom.max property is used when building the url to make
    //  sure we don't use invalid levels)
    if (extent.zoom < layer.options.zoom.min) {
        return false;
    }

    if (extent.zoom > layer.options.zoom.max) {
        extent = OGCWebServiceHelper.WMTS_WGS84Parent(extent, layer.options.zoom.max);
    }
    if (layer.options.tileMatrixSetLimits) {
        if (extent.row < layer.options.tileMatrixSetLimits[extent.zoom].minTileRow ||
            extent.row > layer.options.tileMatrixSetLimits[extent.zoom].maxTileRow ||
            extent.col < layer.options.tileMatrixSetLimits[extent.zoom].minTileCol ||
            extent.col > layer.options.tileMatrixSetLimits[extent.zoom].maxTileCol) {
            return false;
        }
    }
    return true;
}

function tileInsideLimit(tile, layer) {
    // This layer provides data starting at level = layer.options.zoom.min
    // (the zoom.max property is used when building the url to make
    //  sure we don't use invalid levels)
    for (const coord of tile.getCoordsForLayer(layer)) {
        if (!extentInsideLimit(coord, layer)) {
            return false;
        }
    }
    return true;
}

function getColorTextures(toDownload, layer) {
    const promises = [];
    for (let i = 0; i < toDownload.length; i++) {
        promises.push(getColorTexture(toDownload[i], layer));
    }
    return Promise.all(promises);
}

export default {
    preprocessDataLayer,
    executeCommand,
    tileTextureCount,
    tileInsideLimit,
    canTextureBeImproved,
};
