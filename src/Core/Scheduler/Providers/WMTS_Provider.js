/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */

import * as THREE from 'three';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import Extent from '../../Geographic/Extent';

const coordTile = new Extent('WMTS:WGS84', 0, 0, 0);

const supportedFormats = new Map([
    ['image/png', getColorTextures],
    ['image/jpg', getColorTextures],
    ['image/jpeg', getColorTextures],
    ['image/x-bil;bits=32', getXbilTexture],
]);


function customUrl(layer, url, tilematrix, row, col) {
    let urld = url.replace('%TILEMATRIX', tilematrix.toString());
    urld = urld.replace('%ROW', row.toString());
    urld = urld.replace('%COL', col.toString());

    return urld;
}

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
        layer.customUrl = newBaseUrl;
    }
    layer.options.zoom = layer.options.zoom || { min: 2, max: 20 };
}

/**
 * Return url wmts orthophoto
 * @param {{zoom:number,row:number,col:number}} coWMTS
 * @param {Layer} layer
 * @returns {string}
 */
function url(coWMTS, layer) {
    return customUrl(layer, layer.customUrl, coWMTS.zoom, coWMTS.row, coWMTS.col);
}

/**
 * return texture float alpha THREE.js of MNT
 * @param {TileMesh} tile
 * @param {Layer} layer
 * @param {number} targetZoom
 * @returns {Promise<portableXBIL>}
 */
function getXbilTexture(tile, layer, targetZoom) {
    const pitch = new THREE.Vector4(0.0, 0.0, 1.0, 1.0);
    let coordWMTS = tile.getCoordsForLayer(layer)[0];

    if (targetZoom && targetZoom !== coordWMTS.zoom) {
        coordWMTS = OGCWebServiceHelper.WMTS_WGS84Parent(coordWMTS, targetZoom, pitch);
    }

    const urld = url(coordWMTS, layer);

    return OGCWebServiceHelper.getXBilTextureByUrl(urld, layer.networkOptions).then((texture) => {
        texture.coords = coordWMTS;
        return {
            texture,
            pitch,
            min: !texture.min ? 0 : texture.min,
            max: !texture.max ? 0 : texture.max,
        };
    });
}

/**
 * Return texture RGBA THREE.js of orthophoto
 * TODO : RGBA --> RGB remove alpha canal
 * @param {{zoom:number,row:number,col:number}} coordWMTS
 * @param {Layer} layer
 * @returns {Promise<Texture>}
 */
function getColorTexture(coordWMTS, layer) {
    const urld = url(coordWMTS, layer);
    return OGCWebServiceHelper.getColorTextureByUrl(urld, layer.networkOptions).then((texture) => {
        const result = {};
        result.texture = texture;
        result.texture.coords = coordWMTS;
        result.pitch = new THREE.Vector4(0, 0, 1, 1);
        if (layer.transparent) {
            texture.premultiplyAlpha = true;
        }

        return result;
    });
}

function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;
    return supportedFormats.get(layer.format)(tile, layer, command.targetLevel);
}

function tileTextureCount(tile, layer) {
    const tileMatrixSet = layer.options.tileMatrixSet;
    OGCWebServiceHelper.computeTileMatrixSetCoordinates(tile, tileMatrixSet);
    return tile.getCoordsForLayer(layer).length;
}

function tileInsideLimit(tile, layer, targetLevel) {
    // This layer provides data starting at level = layer.options.zoom.min
    // (the zoom.max property is used when building the url to make
    //  sure we don't use invalid levels)
    for (const coord of tile.getCoordsForLayer(layer)) {
        let c = coord;
        // override
        if (targetLevel < c.zoom) {
            OGCWebServiceHelper.WMTS_WGS84Parent(coord, targetLevel, undefined, coordTile);
            c = coordTile;
        }
        if (c.zoom < layer.options.zoom.min || c.zoom > layer.options.zoom.max) {
            return false;
        }
        if (layer.options.tileMatrixSetLimits) {
            if (c.row < layer.options.tileMatrixSetLimits[c.zoom].minTileRow ||
                c.row > layer.options.tileMatrixSetLimits[c.zoom].maxTileRow ||
                c.col < layer.options.tileMatrixSetLimits[c.zoom].minTileCol ||
                c.col > layer.options.tileMatrixSetLimits[c.zoom].maxTileCol) {
                return false;
            }
        }
    }
    return true;
}

function getColorTextures(tile, layer) {
    if (tile.material === null) {
        return Promise.resolve();
    }
    const promises = [];
    const bcoord = tile.getCoordsForLayer(layer);

    for (const coordWMTS of bcoord) {
        promises.push(getColorTexture(coordWMTS, layer));
    }

    return Promise.all(promises);
}

export default {
    preprocessDataLayer,
    executeCommand,
    tileTextureCount,
    tileInsideLimit,
};
