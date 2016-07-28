/**
 * Generated On: 2015-10-5
 * Class: WMS_Provider
 * Description: Provides data from a WMS stream
 */


import Provider from 'Core/Commander/Providers/Provider';
import IoDriver_XBIL from 'Core/Commander/Providers/IoDriver_XBIL';
import IoDriver_Image from 'Core/Commander/Providers/IoDriver_Image';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
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
function WMS_Provider(/*options*/) {
    //Constructor
    Provider.call(this, new IoDriver_XBIL());
    this.cache = CacheRessource();
    this.ioDriverImage = new IoDriver_Image();
    this.ioDriverXML = new IoDriverXML();
    this.projection = new Projection();

    this.getTextureFloat = function(buffer){
        // Start float to RGBA uint8
        var texture = new THREE.DataTexture(buffer, 256, 256, THREE.AlphaFormat, THREE.FloatType);

        texture.needsUpdate = true;
        return texture;

    };
}

WMS_Provider.prototype = Object.create(Provider.prototype);

WMS_Provider.prototype.constructor = WMS_Provider;

WMS_Provider.prototype.url = function(bbox,layer) {
    return this.customUrl(layer.customUrl, bbox);
};
WMS_Provider.prototype.customUrl = function(url,coord) {
    //convert radian to degree, lon is added a offset of Pi
    //to align axisgit  to card center

    var bbox = coord.minCarto.latitude * 180.0 / Math.PI +
                "," +
                (coord.minCarto.longitude - Math.PI)* 180.0 / Math.PI +
                ","+
               coord.maxCarto.latitude* 180.0 / Math.PI +
               "," +
               (coord.maxCarto.longitude - Math.PI )*180.0 / Math.PI;

    var urld = url.replace('%bbox',bbox.toString());

    return urld;

};

WMS_Provider.prototype.preprocessDataLayer = function(layer){
    if(!layer.name)
        throw new Error('layerName is required.');

    layer.format = defaultValue(layer.options.mimetype, "image/png"),
    layer.crs = defaultValue(layer.projection, "EPSG:4326"),
    layer.width = defaultValue(layer.heightMapWidth, 256),
    layer.version = defaultValue(layer.version, "1.3.0"),
    layer.styleName = defaultValue(layer.style, "normal"),
    layer.transparent = defaultValue(layer.transparent, false),
    layer.bbox = defaultValue(layer.bbox, [-180, -90, 180, 90]);
    layer.customUrl = layer.url +
                  '?SERVICE=WMS&REQUEST=GetMap&LAYERS=' + layer.name +
                  '&VERSION=' + layer.version +
                  '&STYLES=' + layer.styleName +
                  '&FORMAT=' + layer.format +
                  '&TRANSPARENT=' + layer.transparent +
                  '&BBOX=%bbox'  +
                  '&CRS=' + layer.crs +
                  "&WIDTH=" + layer.width +
                  "&HEIGHT=" + layer.width;
};

WMS_Provider.prototype.tileInsideLimit = function(tile,layer) {
    var bbox = tile.bbox;
    // shifting longitude because of issue #19
    var west =  layer.bbox[0]*Math.PI/180.0 + Math.PI;
    var east =  layer.bbox[2]*Math.PI/180.0 + Math.PI;
    var bboxRegion = new BoundingBox(west, east, layer.bbox[1]*Math.PI/180.0, layer.bbox[3]*Math.PI/180.0, 0, 0, 0);
    return bboxRegion.intersect(bbox);
};

WMS_Provider.prototype.getColorTexture = function(tile, layer, parameters) {
    if (!this.tileInsideLimit(tile,layer) || tile.material === null) {
        return Promise.resolve();
    }

    var pitch = parameters.ancestor ?
        this.projection.WMS_WGS84Parent(tile.bbox, parameters.ancestor.bbox) :
        new THREE.Vector3(0, 0, 1);

    var bbox = parameters.ancestor ?
        parameters.ancestor.bbox :
        tile.bbox;

    var url = this.url(bbox, layer);

    var result = { pitch };
    result.texture = this.cache.getRessource(url);

    if (result.texture !== undefined) {
        return Promise.resolve(result);
    }
    return this.ioDriverImage.read(url).then(function(image) {

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
            result.texture.url = url;

            this.cache.addRessource(url, result.texture);
        }

        return result;

    }.bind(this)).catch(function(/*reason*/) {
            result.texture = null;
            return result;
        });

};

WMS_Provider.prototype.getXbilTexture = function(tile, layer) {
    var url = this.url(tile.bbox, layer);

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

    return this._IoDriver.read(url).then(function(result) {
        if (result !== undefined) {

            //TODO USE CACHE HERE ???

            result.texture = this.getTextureFloat(result.floatArray);
            result.texture.generateMipmaps = false;
            result.texture.magFilter = THREE.LinearFilter;
            result.texture.minFilter = THREE.LinearFilter;

            // In RGBA elevation texture LinearFilter give some errors with nodata value.
            // need to rewrite sample function in shader
            this.cache.addRessource(url, result);

            return result;
        } else {
            var texture = -1;
            this.cache.addRessource(url, texture);
            return texture;
        }
    }.bind(this));
};

WMS_Provider.prototype.executeCommand = function(command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    var supportedFormats = {
        'image/png':           this.getColorTexture.bind(this),
        'image/jpg':           this.getColorTexture.bind(this),
        'image/jpeg':          this.getColorTexture.bind(this),
        'image/x-bil;bits=32': this.getXbilTexture.bind(this)
    };

    var func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer, command.paramsFunction).then(function(result) {
            return command.resolve(result);
        });
    } else {
        return Promise.reject(new Error('Unsupported mimetype ' + layer.format));
    }
};


/**
 * Returns a texture from the WMS stream with the specified bounding box
 * @param {BoundingBox} bbox: requested bounding box
 * @returns {WMS_Provider_L15.WMS_Provider.prototype@pro;_IoDriver@call;read@call;then}
 */
WMS_Provider.prototype.getTexture = function(bbox) {

    if (bbox === undefined)
        return Promise.resolve(-2);

    var url = this.url(bbox);

    // TODO: this is not optimal: if called again before ioDriverImage resolves, it'll load the image again
    var textureCache = this.cache.getRessource(url);

    if (textureCache !== undefined) {
        return Promise.resolve(textureCache);
    }
    return this.ioDriverImage.read(url).then(function(image) {
        var result = {};
        result.texture = new THREE.Texture(image);
        result.texture.generateMipmaps = false;
        result.texture.magFilter = THREE.LinearFilter;
        result.texture.minFilter = THREE.LinearFilter;
        result.texture.anisotropy = 16;
        this.cache.addRessource(url, result.texture);
        return result.texture;
    }.bind(this));
};

export default WMS_Provider;
