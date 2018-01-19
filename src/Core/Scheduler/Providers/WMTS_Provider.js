/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */

import * as THREE from 'three';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import Extent from '../../Geographic/Extent';

function WMTS_Provider() {
}

WMTS_Provider.prototype.customUrl = function customUrl(layer, url, tilematrix, row, col) {
    let urld = url.replace('%TILEMATRIX', tilematrix.toString());
    urld = urld.replace('%ROW', row.toString());
    urld = urld.replace('%COL', col.toString());

    return urld;
};

WMTS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    layer.fx = layer.fx || 0.0;

    layer.options = layer.options || {};

    if (layer.protocol === 'wmts') {
        const options = layer.options;
        options.version = options.version || '1.0.0';
        options.tileMatrixSet = options.tileMatrixSet || 'WGS84';
        options.mimetype = options.mimetype || 'image/png';
        options.style = options.style || 'normal';
        options.projection = options.projection || 'EPSG:3857';
        let newBaseUrl = `${layer.url}` +
            `?LAYER=${options.name}` +
            `&FORMAT=${options.mimetype}` +
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
};

/**
 * Return url wmts orthophoto
 * @param {{zoom:number,row:number,col:number}} coWMTS
 * @param {Layer} layer
 * @returns {string}
 */
WMTS_Provider.prototype.url = function url(coWMTS, layer) {
    return this.customUrl(layer, layer.customUrl, coWMTS.zoom, coWMTS.row, coWMTS.col);
};

/**
 * return texture float alpha THREE.js of MNT
 * @param {TileMesh} tile
 * @param {Layer} layer
 * @param {number} targetZoom
 * @returns {Promise<portableXBIL>}
 */
WMTS_Provider.prototype.getXbilTexture = function getXbilTexture(tile, layer, targetZoom) {
    const pitch = new THREE.Vector4(0.0, 0.0, 1.0, 1.0);
    let coordWMTS = tile.getCoordsForLayer(layer)[0];

    if (targetZoom && targetZoom !== coordWMTS.zoom) {
        coordWMTS = OGCWebServiceHelper.WMTS_WGS84Parent(coordWMTS, targetZoom, pitch);
    }

    const url = this.url(coordWMTS, layer);

    return OGCWebServiceHelper.getXBilTextureByUrl(url, layer.networkOptions).then((texture) => {
        texture.coords = coordWMTS;
        return {
            texture,
            pitch,
            min: !texture.min ? 0 : texture.min,
            max: !texture.max ? 0 : texture.max,
        };
    });
};

/**
 * Return texture RGBA THREE.js of orthophoto
 * TODO : RGBA --> RGB remove alpha canal
 * @param {{zoom:number,row:number,col:number}} coordWMTS
 * @param {Layer} layer
 * @returns {Promise<Texture>}
 */
WMTS_Provider.prototype.getColorTexture = function getColorTexture(coordWMTS, layer) {
    const url = this.url(coordWMTS, layer);
    return OGCWebServiceHelper.getColorTextureByUrl(url, layer.networkOptions).then((texture) => {
        const result = {};
        result.texture = texture;
        result.texture.coords = coordWMTS;
        result.pitch = new THREE.Vector4(0, 0, 1, 1);
        if (layer.transparent) {
            texture.premultiplyAlpha = true;
        }

        return result;
    });
};

WMTS_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;

    const supportedFormats = {
        'image/png': this.getColorTextures.bind(this),
        'image/jpg': this.getColorTextures.bind(this),
        'image/jpeg': this.getColorTextures.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this),
    };

    const func = supportedFormats[layer.options.mimetype];
    if (func) {
        return func(tile, layer, command.targetLevel);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.options.mimetype}`));
    }
};

WMTS_Provider.prototype.tileTextureCount = function tileTextureCount(tile, layer) {
    const tileMatrixSet = layer.options.tileMatrixSet;
    OGCWebServiceHelper.computeTileMatrixSetCoordinates(tile, tileMatrixSet);
    return tile.getCoordsForLayer(layer).length;
};


const coordTile = new Extent('WMTS:WGS84', 0, 0, 0);
WMTS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer, targetLevel) {
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
};

WMTS_Provider.prototype.getColorTextures = function getColorTextures(tile, layer) {
    if (tile.material === null) {
        return Promise.resolve();
    }
    const promises = [];
    const bcoord = tile.getCoordsForLayer(layer);

    for (const coordWMTS of bcoord) {
        promises.push(this.getColorTexture(coordWMTS, layer));
    }

    return Promise.all(promises);
};

export default WMTS_Provider;
