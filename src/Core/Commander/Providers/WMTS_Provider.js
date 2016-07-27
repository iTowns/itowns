/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */


import Provider from 'Core/Commander/Providers/Provider';
import Projection from 'Core/Geographic/Projection';
import CoordWMTS from 'Core/Geographic/CoordWMTS';
import IoDriver_XBIL from 'Core/Commander/Providers/IoDriver_XBIL';
import IoDriver_Image from 'Core/Commander/Providers/IoDriver_Image';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import THREE from 'THREE';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';

function WMTS_Provider(options) {
    //Constructor

    Provider.call(this, new IoDriver_XBIL());
    this.cache = CacheRessource();
    this.ioDriverImage = new IoDriver_Image();
    this.ioDriverXML = new IoDriverXML();
    this.projection = new Projection();
    this.support = options.support || false;

    this.getTextureFloat;

    if (this.support)
        this.getTextureFloat = function() {
            return new THREE.Texture();
        };
    else
        this.getTextureFloat = function(buffer) {

            // Start float to RGBA uint8
            //var bufferUint = new Uint8Array(buffer.buffer);
            // var texture = new THREE.DataTexture(bufferUint, 256, 256);

            var texture = new THREE.DataTexture(buffer, 256, 256, THREE.AlphaFormat, THREE.FloatType);

            texture.needsUpdate = true;
            return texture;

        };

}

WMTS_Provider.prototype = Object.create(Provider.prototype);

WMTS_Provider.prototype.constructor = WMTS_Provider;

WMTS_Provider.prototype.customUrl = function(url, tilematrix, row, col) {

    var urld = url.replace('%TILEMATRIX', tilematrix.toString());
    urld = urld.replace('%ROW', row.toString());
    urld = urld.replace('%COL', col.toString());

    return urld;

};

WMTS_Provider.prototype.removeLayer = function( /*idLayer*/ ) {

}

WMTS_Provider.prototype.preprocessDataLayer = function(layer) {
    layer.fx = layer.fx || 0.0;
    if (layer.protocol === 'wmtsc') {
        layer.zoom = {
            min: 2,
            max: 20
        };
    } else {

        var options = layer.options;
        var newBaseUrl = layer.url +
            "?LAYER=" + options.name +
            "&FORMAT=" + options.mimetype +
            "&SERVICE=WMTS" +
            "&VERSION=1.0.0" +
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=" + options.tileMatrixSet;

        newBaseUrl += "&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL";
        var arrayLimits = Object.keys(options.tileMatrixSetLimits);

        var size = arrayLimits.length;
        var maxZoom = Number(arrayLimits[size - 1]);
        var minZoom = maxZoom - size + 1;

        layer.zoom = {
            min: minZoom,
            max: maxZoom
        };
        layer.customUrl = newBaseUrl;
    }
};

/**
 * Return url wmts orthophoto
 * @param {type} coWMTS
 * @returns {Object@call;create.urlOrtho.url|String}
 */
WMTS_Provider.prototype.url = function(coWMTS, layer) {

    return this.customUrl(layer.customUrl, coWMTS.zoom, coWMTS.row, coWMTS.col);

};

/**
 * return texture float alpha THREE.js of MNT
 * @param {type} coWMTS : coord WMTS
 * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;_IoDriver@call;read@call;then}
 */
WMTS_Provider.prototype.getXbilTexture = function(tile, layer) {
    var coWMTS = tile.tileCoord;

    var url = this.url(coWMTS, layer);

    // TODO: this is not optimal: if called again before the IoDriver resolves, it'll load the XBIL again
    var textureCache = this.cache.getRessource(url);

    if (textureCache !== undefined)
        return Promise.resolve(textureCache);


    // bug #74
    //var limits = layer.tileMatrixSetLimits[coWMTS.zoom];
    // if (!limits || !coWMTS.isInside(limits)) {
    //     var texture = -1;
    //     this.cache.addRessource(url, texture);
    //     return Promise.resolve(texture);
    // }
    // -> bug #74

    return this._IoDriver.read(url).then(result => {
        //TODO USE CACHE HERE ???

        result.texture = this.getTextureFloat(result.floatArray);
        result.texture.generateMipmaps = false;
        result.texture.magFilter = THREE.LinearFilter;
        result.texture.minFilter = THREE.LinearFilter;

        // In RGBA elevation texture LinearFilter give some errors with nodata value.
        // need to rewrite sample function in shader
        //result.texture.magFilter = THREE.NearestFilter;
        //result.texture.minFilter = THREE.NearestFilter;

        // TODO ATTENTION verifier le context
        result.level = coWMTS.zoom;

        this.cache.addRessource(url, result);

        return result;
    }).catch(() => {
        var texture = -1;
        this.cache.addRessource(url, texture);
        return texture;
    });
};

/**
 * Return texture RGBA THREE.js of orthophoto
 * TODO : RGBA --> RGB remove alpha canal
 * @param {type} coWMTS
 * @param {type} id
 * @returns {WMTS_Provider_L15.WMTS_Provider.prototype@pro;ioDriverImage@call;read@call;then}
 */
WMTS_Provider.prototype.getColorTexture = function(coWMTS, pitch, layer) {

    var result = {
        pitch: pitch
    };
    var url = this.url(coWMTS, layer);

    // TODO: this is not optimal: if called again before ioDriverImage resolves, it'll load the image again
    result.texture = this.cache.getRessource(url);

    if (result.texture !== undefined) {
        return Promise.resolve(result);
    }
    return this.ioDriverImage.read(url).then(function(image) {

        var texture = this.cache.getRessource(image.src);

        if (texture)
            result.texture = texture;
        else {
            result.texture = new THREE.Texture(image);
            result.texture.needsUpdate = true;
            result.texture.generateMipmaps = false;
            result.texture.magFilter = THREE.LinearFilter;
            result.texture.minFilter = THREE.LinearFilter;
            result.texture.anisotropy = 16;
            result.texture.url = url;
            // result.texture.layerId = layerId;

            this.cache.addRessource(url, result.texture);
        }

        return result;

    }.bind(this)).catch(function( /*reason*/ ) {
        //console.error('getColorTexture failed for url |', url, '| Reason:' + reason);
        result.texture = null;

        return result;
    });

};

WMTS_Provider.prototype.executeCommand = function(command) {

    //var service;
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    var supportedFormats = {
        'image/png':           this.getColorTextures.bind(this),
        'image/jpg':           this.getColorTextures.bind(this),
        'image/jpeg':          this.getColorTextures.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this)
    };

    var func = supportedFormats[layer.options.mimetype];
    if (func) {
        return func(tile, layer, command.paramsFunction).then(function(result) {
            return command.resolve(result);
        });
    } else {
        return Promise.reject(new Error('Unsupported mimetype ' + layer.options.mimetype));
    }
};


WMTS_Provider.prototype.getZoomAncestor = function(tile, ancestor, layer) {
    var levelParent = ancestor.level;
    return (levelParent < layer.zoom.min ? tile.level : levelParent) + (layer.options.tileMatrixSet === 'PM' ? 1 : 0);

}

WMTS_Provider.prototype.tileInsideLimit = function(tile, layer) {

    //var limits = layer.tileMatrixSetLimits[tile.level];
    //!coWMTS.isInside(limits)
    return tile.level >= layer.zoom.min && tile.level <= layer.zoom.max;
}

WMTS_Provider.prototype.getColorTextures = function(tile, layer, parameters) {

    var promises = [];
    if (tile.material === null) {
        return Promise.resolve();
    }
    // Request parent's texture if no texture at all
    if (this.tileInsideLimit(tile, layer)) {
        var bcoord = tile.matrixSet[layer.options.tileMatrixSet];

        // WARNING the direction textures is important
        for (var row = bcoord[1].row; row >= bcoord[0].row; row--) {

            var cooWMTS = new CoordWMTS(bcoord[0].zoom, row, bcoord[0].col);
            var pitch = new THREE.Vector3(0.0, 0.0, 1.0);

            if (parameters.ancestor) {
                cooWMTS = this.projection.WMTS_WGS84Parent(
                    cooWMTS,
                    this.getZoomAncestor(tile, parameters.ancestor, layer),
                    pitch);
            }

            promises.push(this.getColorTexture(cooWMTS, pitch, layer));
        }
    }

    if (promises.length)
        return Promise.all(promises);
    else
        return Promise.resolve();

};

export default WMTS_Provider;
