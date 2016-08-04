/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import THREE from 'THREE';
import Provider from 'Core/Commander/Providers/Provider';
import IoDriver_JSON from 'Core/Commander/Providers/IoDriver_JSON';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import BoundingBox from 'Scene/BoundingBox';
import ItownsLine from 'Core/Commander/Providers/ItownsLine';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CoordCarto from 'Core/Geographic/CoordCarto';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function WFS_Provider(/*options*/) {

    Provider.call(this, new IoDriver_JSON());
    this.cache = CacheRessource();
    this.ioDriverXML = new IoDriverXML();
    this.projection = new Projection();
}
WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function(bbox,layer) {
    return this.customUrl(layer.customUrl, bbox);
};
WFS_Provider.prototype.customUrl = function(url,coord) {
    //convert radian to degree, lon is added a offset of Pi
    //to align axisgit  to card center

   /* var bbox = coord.minCarto.latitude * 180.0 / Math.PI +
                "," +
                (coord.minCarto.longitude - Math.PI)* 180.0 / Math.PI +
                ","+
               coord.maxCarto.latitude* 180.0 / Math.PI +
               "," +
               (coord.maxCarto.longitude - Math.PI )*180.0 / Math.PI;
    */
    var bbox =  (coord.minCarto.longitude - Math.PI)* 180.0 / Math.PI +
                "," +
                coord.minCarto.latitude * 180.0 / Math.PI +
                ","+
                (coord.maxCarto.longitude - Math.PI )*180.0 / Math.PI +
               "," +
                coord.maxCarto.latitude* 180.0 / Math.PI;

    var urld = url.replace('%bbox',bbox.toString());

    return urld;

};

WFS_Provider.prototype.preprocessDataLayer = function(layer){
    if(!layer.title)
        throw new Error('layerName is required.');

    layer.format = defaultValue(layer.options.mimetype, "json"),
    layer.crs = defaultValue(layer.projection, "EPSG:4326"),
    layer.version = defaultValue(layer.version, "1.3.0"),
    layer.styleName = defaultValue(layer.styleName, "normal"),
    layer.bbox = defaultValue(layer.bbox, [-180, -90, 180, 90]);
    layer.customUrl = layer.url +
                  'SERVICE=WFS&REQUEST=GetFeature&typeName=' + layer.title +
                  '&VERSION=' + layer.version +
                  '&outputFormat=' + layer.format +
                  '&BBOX=%bbox,' + layer.crs;
};

WFS_Provider.prototype.tileInsideLimit = function(tile,layer) {
    var bbox = tile.bbox;
    var level = tile.level;
    console.log(level)
    // shifting longitude because of issue #19
    var west =  layer.bbox[0]*Math.PI/180.0 + Math.PI;
    var east =  layer.bbox[2]*Math.PI/180.0 + Math.PI;
    var bboxRegion = new BoundingBox(west, east, layer.bbox[1]*Math.PI/180.0, layer.bbox[3]*Math.PI/180.0, 0, 0, 0);
    return (level == 18) && bboxRegion.intersect(bbox);
};

WFS_Provider.prototype.executeCommand = function(command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    //TODO : support xml, gml2
    var supportedFormats = {
        'json':    this.getFeatures.bind(this)
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

WFS_Provider.prototype.getFeatures = function(tile, layer, parameters) {
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

    var result = {pitch: pitch };
    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined) {
        return Promise.resolve(result);
    }
    return this._IoDriver.read(url).then(function(feature) {

       if(feature.crs) {
            var features = feature.features;
            var positions = this.parseGeoJSON(features);
            var geometry = new THREE.BufferGeometry();
            var material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent : true, opacity: 0.9}); //side:THREE.DoubleSide, , linewidth: 5, 
            geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
            geometry.computeBoundingSphere();
            result.feature = new THREE.Line( geometry, material );
            result.feature.frustumCulled = false;
            
            this.cache.addRessource(url, result.feature);
        }

        return result;
    }.bind(this)).catch(function(/*reason*/) {
            result.feature = null;
            return result;
        });

};

WFS_Provider.prototype.parseGeoJSON = function(features) {
    var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    var positions = [];
    for (var r = 0; r < features.length; r++) {

        var hauteur = (features[r].properties.hauteur) || 0;
        var polygon = features[r].geometry.coordinates[0][0];

        if (polygon.length > 2) {
            for (var j = 0; j < polygon.length - 1; ++j) {
                var pt2DTab = polygon[j]; //.split(' ');
                //long et puis lat
                //var pt = new THREE.Vector3(parseFloat(pt2DTab[1]), hauteur, parseFloat(pt2DTab[0]));
                var coordCarto = new CoordCarto().setFromDegreeGeo(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), hauteur);
                var spt = ellipsoid.cartographicToCartesian(coordCarto);
                positions.push( spt.x, spt.y, spt.z);
            }

        }
    }
    
    return new Float32Array( positions );
};


/**
 * Returns the url for a WMS query with the specified bounding box
 * @param {BoundingBox} bbox: requested bounding box
 * @returns {Object@call;create.url.url|String}
 * ex http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?service=WFS&version=2.0.0
 * &REQUEST=GetFeature&typeName=BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie
 * &bbox=2.325,48.855,2.335,48.865,epsg:4326&outputFormat=json
 */
/*
WFS_Provider.prototype.url = function(bbox) {

    var url = this.baseUrl +
        "SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature" +
        "&typeName=" + this.typename + "&BBOX=" +
        bbox.minCarto.longitude + "," + bbox.minCarto.latitude + "," +
        bbox.maxCarto.longitude + "," + bbox.maxCarto.latitude +
        ",epsg:" + this.epsgCode + "&outputFormat=" + this.format;

    return url;
};

WFS_Provider.prototype.getData = function(bbox) {

    var url = this.url(bbox);
    return this.ioDriver_JSON.read(url);
};

*/
export default WFS_Provider;
