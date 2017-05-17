/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */


import * as THREE from 'three';
import Extent from '../../Geographic/Extent';
import OGCWebServiceHelper from './OGCWebServiceHelper';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 */
function WMS_Provider() {
}

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
    if (!layer.extent) {
        throw new Error('extent is required');
    }
    if (!layer.projection) {
        throw new Error('projection is required');
    }

    if (!(layer.extent instanceof Extent)) {
        layer.extent = new Extent(layer.projection, layer.extent);
    }

    if (!layer.options.zoom) {
        layer.options.zoom = { min: 0, max: 21 };
    }

    layer.bbox_url = layer.bbox_url || 'swne';
    layer.format = layer.options.mimetype || 'image/png';
    layer.width = layer.heightMapWidth || 256;
    layer.version = layer.version || '1.3.0';
    layer.style = layer.style || '';
    layer.transparent = layer.transparent || false;

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
    return tile.level >= layer.options.zoom.min && tile.level <= layer.options.zoom.max && layer.extent.intersect(tile.extent);
};

WMS_Provider.prototype.getColorTexture = function getColorTexture(tile, layer, rawImage) {
    if (!this.tileInsideLimit(tile, layer)) {
        return Promise.reject(`Tile '${tile}' is outside layer bbox ${layer.extent}`);
    }
    if (tile.material === null) {
        return Promise.resolve();
    }

    const coords = tile.extent.as(layer.projection);
    const url = this.url(coords, layer);
    const pitch = new THREE.Vector3(0, 0, 1);
    const result = { pitch };

    return (rawImage ? OGCWebServiceHelper.getColorImgByUrl(url, layer.networkOptions) : OGCWebServiceHelper.getColorTextureByUrl(url, layer.networkOptions))
    .then((texture) => {
        result.texture = texture;
        result.texture.extent = tile.extent; // useless?
        result.texture.coords = coords;
        // LayeredMaterial expects coords.zoom to exist, and describe the
        // precision of the texture (a la WMTS).
        result.texture.coords.zoom = tile.level;
        return result;
    });
};

WMS_Provider.prototype.getXbilTexture = function getXbilTexture(tile, layer) {
    const url = this.url(tile.extent.as(layer.projection), layer);
    return this.getXBilTextureByUrl(url, new THREE.Vector3(0, 0, 1));
};

WMS_Provider.prototype.executeCommand = function executeCommand(command) {
    const tile = command.requester;

    const layer = command.layer;
    const supportedFormats = {
        'image/png': this.getColorTexture.bind(this),
        'image/jpg': this.getColorTexture.bind(this),
        'image/jpeg': this.getColorTexture.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this),
    };

    const func = supportedFormats[layer.format];

    if (func) {
        return func(tile, layer, command.rawImage);
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};

export default WMS_Provider;
