/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */


import Provider from 'Core/Commander/Providers/Provider';
import IoDriver_XBIL from 'Core/Commander/Providers/IoDriver_XBIL';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import * as THREE from 'three';
import Projection from 'Core/Geographic/Projection';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import mE from 'Core/Math/MathExtented';
import BoundingBox from 'Scene/BoundingBox';
import { UNIT } from 'Core/Geographic/GeoCoordinate';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function WMS_Provider(/* options*/) {
    // Constructor
    Provider.call(this, new IoDriver_XBIL());
    this.cache = CacheRessource();
    this.projection = new Projection();

    this.getTextureFloat = function (buffer) {
        // Start float to RGBA uint8
        var texture = new THREE.DataTexture(buffer, 256, 256, THREE.AlphaFormat, THREE.FloatType);

        texture.needsUpdate = true;
        return texture;
    };
}

WMS_Provider.prototype = Object.create(Provider.prototype);

WMS_Provider.prototype.constructor = WMS_Provider;

WMS_Provider.prototype.url = function (bbox, layer) {
    return this.customUrl(layer.customUrl, bbox);
};

WMS_Provider.prototype.customUrl = function (url, bbox) {
    var bboxDegS = `${bbox.south(UNIT.DEGREE)},${
                    bbox.west(UNIT.DEGREE)},${
                    bbox.north(UNIT.DEGREE)},${
                    bbox.east(UNIT.DEGREE)}`;

    var urld = url.replace('%bbox', bboxDegS);

    return urld;
};

WMS_Provider.prototype.preprocessDataLayer = function (layer) {
    if (!layer.name)
        { throw new Error('layerName is required.'); }

    if (layer.bbox)
    {
        mE.arrayDegToRad(layer.bbox);
        layer.bbox = new BoundingBox(layer.bbox[0], layer.bbox[2], layer.bbox[1], layer.bbox[3]);
    }

    layer.format = layer.options.mimetype || 'image/png';
    layer.crs = layer.projection || 'EPSG:4326';
    layer.width = layer.heightMapWidth || 256;
    layer.version = layer.version || '1.3.0';
    layer.style = layer.style || '';
    layer.transparent = layer.transparent || false;
    layer.bbox = layer.bbox || new BoundingBox();

    layer.customUrl = `${layer.url
                  }?SERVICE=WMS&REQUEST=GetMap&LAYERS=${layer.name
                  }&VERSION=${layer.version
                  }&STYLES=${layer.style
                  }&FORMAT=${layer.format
                  }&TRANSPARENT=${layer.transparent
                  }&BBOX=%bbox` +
                  `&CRS=${layer.crs
                  }&WIDTH=${layer.width
                  }&HEIGHT=${layer.width}`;
};

WMS_Provider.prototype.tileInsideLimit = function (tile, layer) {
    return tile.level > 2 && layer.bbox.intersect(tile.bbox);
};

WMS_Provider.prototype.getColorTexture = function (tile, layer, bbox, pitch) {
    if (!this.tileInsideLimit(tile, layer) || tile.material === null) {
        return Promise.resolve();
    }

    var url = this.url(bbox, layer);

    var result = { pitch };
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

WMS_Provider.prototype.getXbilTexture = function (tile, layer, bbox, pitch) {
    var url = this.url(bbox, layer);

    // TODO: this is not optimal: if called again before the IoDriver resolves, it'll load the XBIL again
    var textureCache = this.cache.getRessource(url);

    if (textureCache !== undefined) {
        return Promise.resolve(textureCache ? {
            pitch,
            texture: textureCache.texture,
            min: textureCache.min,
            max: textureCache.max,
        } : null);
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
        if (result !== undefined) {
            result.texture = this.getTextureFloat(result.floatArray);
            result.texture.generateMipmaps = false;
            result.texture.magFilter = THREE.LinearFilter;
            result.texture.minFilter = THREE.LinearFilter;
            result.pitch = pitch;

            // In RGBA elevation texture LinearFilter give some errors with nodata value.
            // need to rewrite sample function in shader
            this.cache.addRessource(url, result);

            return result;
        } else {
            var texture = null;
            this.cache.addRessource(url, texture);
            return texture;
        }
    });
};

WMS_Provider.prototype.executeCommand = function (command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;
    var ancestor = command.paramsFunction.ancestor;

    var supportedFormats = {
        'image/png': this.getColorTexture.bind(this),
        'image/jpg': this.getColorTexture.bind(this),
        'image/jpeg': this.getColorTexture.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this),
    };

    var func = supportedFormats[layer.format];
    if (func) {
        var pitch = ancestor ?
            this.projection.WMS_WGS84Parent(tile.bbox, ancestor.bbox) :
            new THREE.Vector3(0, 0, 1);

        var bbox = ancestor ?
            ancestor.bbox :
            tile.bbox;


        return func(tile, layer, bbox, pitch).then(result => command.resolve(result));
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};


/**
 * Returns a texture from the WMS stream with the specified bounding box
 * @param {BoundingBox} bbox: requested bounding box
 * @returns {WMS_Provider_L15.WMS_Provider.prototype@pro;_IoDriver@call;read@call;then}
 */
WMS_Provider.prototype.getTexture = function (bbox) {
    if (bbox === undefined)
        { return Promise.resolve(-2); }

    var url = this.url(bbox);

    // TODO: this is not optimal: if called again before ioDriverImage resolves, it'll load the image again
    var textureCache = this.cache.getRessource(url);

    if (textureCache !== undefined) {
        return Promise.resolve(textureCache);
    }
    return this.ioDriverImage.read(url).then((image) => {
        var result = {};
        result.texture = new THREE.Texture(image);
        result.texture.generateMipmaps = false;
        result.texture.magFilter = THREE.LinearFilter;
        result.texture.minFilter = THREE.LinearFilter;
        result.texture.anisotropy = 16;
        this.cache.addRessource(url, result.texture);
        return result.texture;
    });
};

export default WMS_Provider;
