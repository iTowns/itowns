/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */


import * as THREE from 'three';
import BoundingBox from '../../../Scene/BoundingBox';
import TiledImageTools from './TiledImageTools';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function WMS_Provider() {
}

WMS_Provider.prototype.constructor = WMS_Provider;

WMS_Provider.prototype.url = function url(bbox, layer) {
    const box = bbox.as(layer.projection);
    const v = [
        box.west(),
        box.south(),
        box.east(),
        box.north(),
    ];
    const bboxInUnit = layer.bbox_url === 'swne' ?
        `${v[1]},${v[0]},${v[3]},${v[2]}` :
        `${v[0]},${v[1]},${v[2]},${v[3]}`;

    return layer.customUrl.replace('%bbox', bboxInUnit);
};

WMS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.name) {
        throw new Error('layerName is required.');
    }
    if (!layer.bbox) {
        throw new Error('bbox is required');
    }
    if (!layer.projection) {
        throw new Error('projection is required');
    }

    layer.bbox = new BoundingBox(
        layer.projection,
        layer.bbox[0], layer.bbox[1],
        layer.bbox[2], layer.bbox[3]);

    layer.bbox_url = layer.bbox_url || 'swne';
    layer.format = layer.options.mimetype || 'image/png';
    layer.width = layer.heightMapWidth || 256;
    layer.version = layer.version || '1.3.0';
    layer.style = layer.style || '';
    layer.transparent = layer.transparent || false;
    layer.options = {};

    layer.customUrl = `${layer.url
                  }?SERVICE=WMS&REQUEST=GetMap&LAYERS=${layer.name
                  }&VERSION=${layer.version
                  }&STYLES=${layer.style
                  }&FORMAT=${layer.format
                  }&TRANSPARENT=${layer.transparent
                  }&BBOX=%bbox` +
                  `&CRS=${layer.projection
                  }&WIDTH=${layer.width
                  }&HEIGHT=${layer.width}`;
};

WMS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer) {
    return tile.level > 2 && layer.bbox.intersect(tile.bbox);
};

WMS_Provider.prototype.getColorTexture = function getColorTexture(tile, layer) {
    if (!this.tileInsideLimit(tile, layer) || tile.material === null) {
        return Promise.resolve();
    }

    const url = this.url(tile.bbox.as(layer.projection), layer);
    const pitch = new THREE.Vector3(0, 0, 1);
    const result = { pitch };

    return TiledImageTools.getColorTextureByUrl(url).then((texture) => {
        result.texture = texture;
        result.texture.bbox = tile.bbox;
        return result;
    });
};

WMS_Provider.prototype.getXbilTexture = function getXbilTexture(tile, layer) {
    const url = this.url(tile.bbox.as(layer.projection), layer);
    return this.getXBilTextureByUrl(url, new THREE.Vector3(0, 0, 1));
};

WMS_Provider.prototype.executeCommand = function executeCommand(command) {
    const parentTextures = command.parentTextures;
    const tile = command.requester;

    if (parentTextures) {
        const texture = parentTextures[0];
        const pitch = TiledImageTools.WMS_WGS84Parent(tile.bbox, texture.bbox);
        return Promise.resolve({ pitch, texture });
    }

    const layer = command.layer;
    const supportedFormats = {
        'image/png': this.getColorTexture.bind(this),
        'image/jpg': this.getColorTexture.bind(this),
        'image/jpeg': this.getColorTexture.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this),
    };

    const func = supportedFormats[layer.format];

    if (func) {
        return func(tile, layer);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

export default WMS_Provider;
