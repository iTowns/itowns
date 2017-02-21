/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */

import * as THREE from 'three';
import CoordWMTS from '../../Geographic/CoordWMTS';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from './OGCWebServiceHelper';

const WMTS_WGS84Parent = function WMTS_WGS84Parent(cWMTS, levelParent, pitch) {
    const diffLevel = cWMTS.zoom - levelParent;
    const diff = Math.pow(2, diffLevel);
    const invDiff = 1 / diff;

    const r = (cWMTS.row - (cWMTS.row % diff)) * invDiff;
    const c = (cWMTS.col - (cWMTS.col % diff)) * invDiff;

    pitch.x = cWMTS.col * invDiff - c;
    pitch.y = cWMTS.row * invDiff - r;
    pitch.z = invDiff;

    return new CoordWMTS(levelParent, r, c);
};

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
    if (layer.protocol === 'wmtsc') {
        layer.options.zoom = {
            min: 2,
            max: 20,
        };
    } else {
        const options = layer.options;
        options.version = options.version || '1.0.0';
        options.tileMatrixSet = options.tileMatrixSet || 'WGS84';
        options.mimetype = options.mimetype || 'image/png';
        options.style = options.style || 'normal';
        options.projection = options.projection || 'EPSG:3857';
        let newBaseUrl = `${layer.url
            }?LAYER=${options.name
            }&FORMAT=${options.mimetype
            }&SERVICE=WMTS` +
            '&VERSION=1.0.0' +
            `&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=${options.tileMatrixSet}`;

        newBaseUrl += '&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';

        if (!layer.options.zoom && options.tileMatrixSetLimits) {
            const arrayLimits = Object.keys(options.tileMatrixSetLimits);
            const size = arrayLimits.length;
            const maxZoom = Number(arrayLimits[size - 1]);
            const minZoom = maxZoom - size + 1;

            layer.options.zoom = {
                min: minZoom,
                max: maxZoom,
            };
        } else {
            layer.options.zoom = {
                min: 2,
                max: 20,
            };
        }
        layer.customUrl = newBaseUrl;
    }
};

/**
 * Return url wmts orthophoto
 * @param {type} coWMTS
 * @returns {Object@call;create.urlOrtho.url|String}
 */
WMTS_Provider.prototype.url = function url(coWMTS, layer) {
    return this.customUrl(layer, layer.customUrl, coWMTS.zoom, coWMTS.row, coWMTS.col);
};

/**
 * return texture float alpha THREE.js of MNT
 * @param {type} coWMTS : coord WMTS
 * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
 */
WMTS_Provider.prototype.getXbilTexture = function getXbilTexture(tile, layer, targetZoom) {
    const pitch = new THREE.Vector3(0.0, 0.0, 1.0);
    let coordWMTS = tile.wmtsCoords[layer.options.tileMatrixSet][0];

    if (targetZoom && targetZoom !== coordWMTS.zoom) {
        coordWMTS = WMTS_WGS84Parent(coordWMTS, targetZoom, pitch);
    }

    const url = this.url(coordWMTS, layer);

    return OGCWebServiceHelper.getXBilTextureByUrl(url).then((result) => {
        const { min, max } = OGCWebServiceHelper.ioDXBIL.computeMinMaxElevation(
        result.texture.image.data,
        SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
        pitch);
        result.min = min === undefined ? 0 : min;
        result.max = max === undefined ? 0 : max;
        result.texture.coordWMTS = coordWMTS;
        result.pitch = pitch;
        return result;
    });
};

/**
 * Return texture RGBA THREE.js of orthophoto
 * TODO : RGBA --> RGB remove alpha canal
 * @param {type} coordWMTS
 * @param {type} id
 * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
 */
WMTS_Provider.prototype.getColorTexture = function getColorTexture(coordWMTS, layer) {
    const url = this.url(coordWMTS, layer);
    return OGCWebServiceHelper.getColorTextureByUrl(url).then((texture) => {
        const result = {};
        result.texture = texture;
        result.texture.coordWMTS = coordWMTS;
        result.pitch = new THREE.Vector3(0, 0, 1);

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
    return tile.wmtsCoords[tileMatrixSet][1].row - tile.wmtsCoords[tileMatrixSet][0].row + 1;
};

WMTS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    // This layer provides data starting at level = layer.options.zoom.min
    // (the zoom.max property is used when building the url to make
    //  sure we don't use invalid levels)
    return layer.options.zoom.min <= tile.wmtsCoords[layer.options.tileMatrixSet][0].zoom; // && tile.level <= layer.zoom.max;
};

WMTS_Provider.prototype.getColorTextures = function getColorTextures(tile, layer) {
    if (tile.material === null) {
        return Promise.resolve();
    }
    const promises = [];
    const bcoord = tile.wmtsCoords[layer.options.tileMatrixSet];

    for (let row = bcoord[1].row; row >= bcoord[0].row; row--) {
        const coordWMTS = new CoordWMTS(bcoord[0].zoom, row, bcoord[0].col);
        promises.push(this.getColorTexture(coordWMTS, layer));
    }

    return Promise.all(promises);
};

export default WMTS_Provider;
