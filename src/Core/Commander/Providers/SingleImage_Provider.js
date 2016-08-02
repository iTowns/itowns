/**
 * Generated On: 2015-10-5
 * Class: SingleImage_Provider
 * Description: Provides data from a WMS stream
 */


import Provider from 'Core/Commander/Providers/Provider';
import IoDriver_Image from 'Core/Commander/Providers/IoDriver_Image';
import defaultValue from 'Core/defaultValue';
import THREE from 'THREE';
import Projection from 'Core/Geographic/Projection';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import BoundingBox from 'Scene/BoundingBox';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function SingleImage_Provider(/*options*/) {
    //Constructor
    Provider.call(this, new IoDriver_Image());
    this.cache = CacheRessource();
    this.projection = new Projection();
}

SingleImage_Provider.prototype = Object.create(Provider.prototype);

SingleImage_Provider.prototype.constructor = SingleImage_Provider;

SingleImage_Provider.prototype.preprocessDataLayer = function(layer){
    if(!layer.name)
        throw new Error('layerName is required.');

    layer.format = defaultValue(layer.options.mimetype, "image/png");
    layer.crs = defaultValue(layer.projection, "EPSG:4326");
    layer.width = defaultValue(layer.heightMapWidth, 256);
    var bbox = defaultValue(layer.bbox, [-180, -90, 180, 90]);
    layer.bbox = new BoundingBox(bbox[0], bbox[2], bbox[1], bbox[3]);
};

SingleImage_Provider.prototype.tileInsideLimit = function(tile,layer) {
    var bbox = tile.bbox;
    // shifting longitude because of issue #19
    var west =  layer.bbox[0]*Math.PI/180.0 + Math.PI;
    var east =  layer.bbox[2]*Math.PI/180.0 + Math.PI;
    var bboxRegion = new BoundingBox(west, east, layer.bbox[1]*Math.PI/180.0, layer.bbox[3]*Math.PI/180.0, 0, 0, 0);
    return true || bboxRegion.intersect(bbox);
};

SingleImage_Provider.prototype.getColorTexture = function(tile, layer) {
    if (!this.tileInsideLimit(tile,layer) || tile.material === null) {
        return Promise.resolve();
    }

    var pitch = this.projection.childBBtoOffsetScale(tile.crs, tile.bbox, layer.bbox);

    var result = { pitch };
    result.texture = this.cache.getRessource(layer.url);

    if (result.texture !== undefined) {
        return Promise.resolve(result);
    }
    return this._IoDriver.read(layer.url).then(function(image) {

        var texture = this.cache.getRessource(image.src);

        if(texture)
            result.texture = texture;
        else
        {
            result.texture = new THREE.Texture(image);
            result.texture.needsUpdate = true;
            result.texture.generateMipmaps = false;
            result.texture.magFilter = THREE.LinearFilter;
            result.texture.minFilter = THREE.LinearFilter;
            result.texture.anisotropy = 16;
            result.texture.url = layer.url;
            result.texture.level = tile.level;

            this.cache.addRessource(layer.url, result.texture);
        }

        return result;
    }.bind(this));

};

SingleImage_Provider.prototype.executeCommand = function(command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    var supportedFormats = {
        'image/png':           this.getColorTexture.bind(this),
        'image/jpg':           this.getColorTexture.bind(this),
        'image/jpeg':          this.getColorTexture.bind(this)
    };

    var func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer).then(function(result) {
            return command.resolve(result);
        });
    } else {
        return Promise.reject(new Error('Unsupported mimetype ' + layer.format));
    }
};

export default SingleImage_Provider;
