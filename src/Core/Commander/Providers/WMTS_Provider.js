/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */

import * as THREE from 'three';
import CoordWMTS from '../../Geographic/CoordWMTS';
import Tish from './TiledImageTools';

function WMTS_Provider() {
}

WMTS_Provider.prototype.constructor = WMTS_Provider;

WMTS_Provider.prototype.customUrl = function customUrl(layer, url, tilematrix, row, col) {
    const tm = Math.min(layer.zoom.max, tilematrix);

    let urld = url.replace('%TILEMATRIX', tm.toString());
    urld = urld.replace('%ROW', row.toString());
    urld = urld.replace('%COL', col.toString());

    return urld;
};

WMTS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    layer.fx = layer.fx || 0.0;
    if (layer.protocol === 'wmtsc') {
        layer.zoom = {
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
        const arrayLimits = Object.keys(options.tileMatrixSetLimits);

        const size = arrayLimits.length;
        const maxZoom = Number(arrayLimits[size - 1]);
        const minZoom = maxZoom - size + 1;

        layer.zoom = {
            min: minZoom,
            max: maxZoom,
        };
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
WMTS_Provider.prototype.getXbilTexture = function getXbilTexture(tile, layer, parentTextures) {
    let coordWMTS = tile.wmtsCoords[layer.options.tileMatrixSet][0];
    const pitch = new THREE.Vector3(0.0, 0.0, 1.0);

    if (parentTextures) {
        coordWMTS = Tish.WMTS_WGS84Parent(
            coordWMTS,
            parentTextures[0].coordWMTS.zoom,
            pitch);
        return Tish.cropXbilTexture(parentTextures[0], pitch);
    }

    const url = this.url(coordWMTS, layer);

    return Tish.getXBilTextureByUrl(url, pitch).then((result) => {
        result.texture.coordWMTS = coordWMTS;
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
    return Tish.getColorTextureByUrl(url).then((texture) => {
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
    const parentTextures = command.parentTextures;
    const supportedFormats = {
        'image/png': this.getColorTextures.bind(this),
        'image/jpg': this.getColorTextures.bind(this),
        'image/jpeg': this.getColorTextures.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this),
    };

    const func = supportedFormats[layer.options.mimetype];
    if (func) {
        return func(tile, layer, parentTextures);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.options.mimetype}`));
    }
};

WMTS_Provider.prototype.tileTextureCount = function tileTextureCount(tile, layer) {
    const tileMatrixSet = layer.options.tileMatrixSet;
    return tile.wmtsCoords[tileMatrixSet][1].row - tile.wmtsCoords[tileMatrixSet][0].row + 1;
};

WMTS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    // This layer provides data starting at level = layer.zoom.min
    // (the zoom.max property is used when building the url to make
    //  sure we don't use invalid levels)
    return layer.zoom.min <= tile.level;
};

WMTS_Provider.prototype.getColorTextures = function getColorTextures(tile, layer, parentTextures) {
    const promises = [];
    if (tile.material === null) {
        return Promise.resolve();
    }

    // Request parent's texture if no texture at all
    if (this.tileInsideLimit(tile, layer)) {
        const bcoord = tile.wmtsCoords[layer.options.tileMatrixSet];

        for (let row = bcoord[1].row; row >= bcoord[0].row; row--) {
            let coordWMTS = new CoordWMTS(bcoord[0].zoom, row, bcoord[0].col);

            if (parentTextures) {
                const pitch = new THREE.Vector3();
                coordWMTS = Tish.WMTS_WGS84Parent(coordWMTS, parentTextures[0].coordWMTS.zoom, pitch);
                promises.push(Promise.resolve({ pitch,
                    texture: parentTextures.find(texture => texture.coordWMTS.equals(coordWMTS)),
                }));
            } else {
                promises.push(this.getColorTexture(coordWMTS, layer));
            }
        }
    }

    if (promises.length)
        { return Promise.all(promises); }
    else
        { return Promise.resolve(); }
};

export default WMTS_Provider;
