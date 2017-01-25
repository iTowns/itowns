/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */


import Provider from 'Core/Commander/Providers/Provider';
import Projection from 'Core/Geographic/Projection';
import CoordWMTS from 'Core/Geographic/CoordWMTS';
import IoDriver_XBIL from 'Core/Commander/Providers/IoDriver_XBIL';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import * as THREE from 'three';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';

const SIZE_TEXTURE_TILE = 256;

function WMTS_Provider(options) {
    // Constructor

    Provider.call(this, new IoDriver_XBIL());
    this.cache = CacheRessource();
    this.projection = new Projection();
    this.support = options.support || false;
    this.getTextureFloat = null;

    if (this.support)
        { this.getTextureFloat = function getTextureFloat() {
            return new THREE.Texture();
        }; }
    else
        { this.getTextureFloat = function getTextureFloat(buffer) {
            // Start float to RGBA uint8
            // var bufferUint = new Uint8Array(buffer.buffer);
            // var texture = new THREE.DataTexture(bufferUint, 256, 256);

            var texture = new THREE.DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, THREE.AlphaFormat, THREE.FloatType);

            texture.needsUpdate = true;
            return texture;
        }; }
}

WMTS_Provider.prototype = Object.create(Provider.prototype);

WMTS_Provider.prototype.constructor = WMTS_Provider;

WMTS_Provider.prototype.customUrl = function customUrl(layer, url, tilematrix, row, col) {
    const tm = Math.min(layer.zoom.max, tilematrix);

    let urld = url.replace('%TILEMATRIX', tm.toString());
    urld = urld.replace('%ROW', row.toString());
    urld = urld.replace('%COL', col.toString());

    return urld;
};

WMTS_Provider.prototype.removeLayer = function removeLayer(/* idLayer*/) {

};

WMTS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    layer.fx = layer.fx || 0.0;
    if (layer.protocol === 'wmtsc') {
        layer.zoom = {
            min: 2,
            max: 20,
        };
    } else {
        var options = layer.options;
        options.version = options.version || '1.0.0';
        options.tileMatrixSet = options.tileMatrixSet || 'WGS84';
        options.mimetype = options.mimetype || 'image/png';
        options.style = options.style || 'normal';
        options.projection = options.projection || 'EPSG:3857';
        var newBaseUrl = `${layer.url
            }?LAYER=${options.name
            }&FORMAT=${options.mimetype
            }&SERVICE=WMTS` +
            '&VERSION=1.0.0' +
            `&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=${options.tileMatrixSet}`;

        newBaseUrl += '&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';
        var arrayLimits = Object.keys(options.tileMatrixSetLimits);

        var size = arrayLimits.length;
        var maxZoom = Number(arrayLimits[size - 1]);
        var minZoom = maxZoom - size + 1;

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
WMTS_Provider.prototype.getXbilTexture = function getXbilTexture(tile, layer, parameters) {
    var cooWMTS = tile.wmtsCoords[layer.options.tileMatrixSet][0];
    var pitch = new THREE.Vector3(0.0, 0.0, 1.0);

    if (parameters.ancestor) {
        // account for possible level offset between coords and tile level
        // (e.g for PM texture cooWMTS.level = tile.level + 1)
        var levelOffset = cooWMTS.zoom - tile.level;

        cooWMTS = this.projection.WMTS_WGS84Parent(
            cooWMTS,
            this.computeLevelToDownload(tile, parameters.ancestor, layer) + levelOffset,
            pitch);
    }

    var url = this.url(cooWMTS, layer);

    // TODO: this is not optimal: if called again before the IoDriver resolves, it'll load the XBIL again
    var textureCache = this.cache.getRessource(url);

    if (textureCache !== undefined) {
        const minmax = this._IoDriver.computeMinMaxElevation(
            textureCache.floatArray,
            SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
            pitch);
        return Promise.resolve(
            {
                pitch,
                texture: textureCache.texture,
                min: minmax.min,
                max: minmax.max,
            });
    }


    // bug #74
    // var limits = layer.tileMatrixSetLimits[coWMTS.zoom];
    // if (!limits || !coWMTS.isInside(limits)) {
    //     var texture = -1;
    //     this.cache.addRessource(url, texture);
    //     return Promise.resolve(texture);
    // }
    // -> bug #74

    return this._IoDriver.read(url).then((result) => {
        result.pitch = pitch;
        result.texture = this.getTextureFloat(result.floatArray);
        result.texture.generateMipmaps = false;
        result.texture.magFilter = THREE.LinearFilter;
        result.texture.minFilter = THREE.LinearFilter;
        this.cache.addRessource(url, { texture: result.texture, floatArray: result.floatArray });

        return result;
    });
};

/**
 * Return texture RGBA THREE.js of orthophoto
 * TODO : RGBA --> RGB remove alpha canal
 * @param {type} coWMTS
 * @param {type} id
 * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
 */
WMTS_Provider.prototype.getColorTexture = function getColorTexture(coWMTS, pitch, layer) {
    var result = {
        pitch,
    };
    var url = this.url(coWMTS, layer);

    result.texture = this.cache.getRessource(url);

    if (result.texture !== undefined) {
        return Promise.resolve(result);
    }

    const { texture, promise } = Fetcher.texture(url);
    result.texture = texture;

    result.texture.generateMipmaps = false;
    result.texture.magFilter = THREE.LinearFilter;
    result.texture.minFilter = THREE.LinearFilter;
    result.texture.anisotropy = 16;

    return promise.then(() => {
        this.cache.addRessource(url, result.texture);
        result.texture.needsUpdate = true;
        return result;
    });
};

function computeTileWMTSCoordinates(tile, wmtsLayer, projection) {
    // Are WMTS coordinates ready?
    if (!tile.wmtsCoords) {
        tile.wmtsCoords = {};
    }

    const tileMatrixSet = wmtsLayer.options.tileMatrixSet;
    if (!(tileMatrixSet in tile.wmtsCoords)) {
        const tileCoord = projection.WGS84toWMTS(tile.bbox);

        tile.wmtsCoords[tileMatrixSet] =
            projection.getCoordWMTS_WGS84(tileCoord, tile.bbox, tileMatrixSet);
    }
}

WMTS_Provider.prototype.executeCommand = function executeCommand(command) {
    var layer = command.layer;
    var tile = command.requester;

    computeTileWMTSCoordinates(tile, layer, this.projection);

    var supportedFormats = {
        'image/png': this.getColorTextures.bind(this),
        'image/jpg': this.getColorTextures.bind(this),
        'image/jpeg': this.getColorTextures.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this),
    };

    var func = supportedFormats[layer.options.mimetype];
    if (func) {
        return func(tile, layer, command);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.options.mimetype}`));
    }
};


WMTS_Provider.prototype.computeLevelToDownload = function computeLevelToDownload(tile, ancestor, layer) {
    // Use ancestor's level if valid, else fallback on tile's level
    var lvl = ancestor ? ancestor.level : tile.level;

    return Math.min(
        layer.zoom.max,
        Math.max(
            layer.zoom.min,
            lvl));
};

WMTS_Provider.prototype.tileTextureCount = function tileTextureCount(tile, layer) {
    computeTileWMTSCoordinates(tile, layer, this.projection);

    const tileMatrixSet = layer.options.tileMatrixSet;
    return tile.wmtsCoords[tileMatrixSet][1].row - tile.wmtsCoords[tileMatrixSet][0].row + 1;
};

WMTS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    // This layer provides data starting at level = layer.zoom.min
    // (the zoom.max property is used when building the url to make
    //  sure we don't use invalid levels)
    return layer.zoom.min <= tile.level;
};

WMTS_Provider.prototype.getColorTextures = function getColorTextures(tile, layer, parameters) {
    var promises = [];
    if (tile.material === null) {
        return Promise.resolve();
    }
    // Request parent's texture if no texture at all
    if (this.tileInsideLimit(tile, layer)) {
        var bcoord = tile.wmtsCoords[layer.options.tileMatrixSet];

        // WARNING the direction textures is important
        for (var row = bcoord[1].row; row >= bcoord[0].row; row--) {
            var cooWMTS = new CoordWMTS(bcoord[0].zoom, row, bcoord[0].col);
            var pitch = new THREE.Vector3(0.0, 0.0, 1.0);

            if (parameters.ancestor) {
                // account for possible level offset between coords and tile level
                // (e.g for PM texture cooWMTS.level = tile.level + 1)
                var levelOffset = cooWMTS.zoom - tile.level;

                cooWMTS = this.projection.WMTS_WGS84Parent(
                    cooWMTS,
                    this.computeLevelToDownload(tile, parameters.ancestor, layer) + levelOffset,
                    pitch);
            }

            promises.push(this.getColorTexture(cooWMTS, pitch, layer));
        }
    }

    if (promises.length)
        { return Promise.all(promises); }
    else
        { return Promise.resolve(); }
};

export default WMTS_Provider;
