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
import CVML from 'Core/Math/CVML';

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
            if(layer.type == "poly")
                result.feature = this.GeoJSON2Polygon(features);
            else if(layer.type = "bbox")
                result.feature = this.GeoJSON2BBox(features);
            
            this.cache.addRessource(url, result.feature);
        }

        return result;
    }.bind(this)).catch(function(/*reason*/) {
            result.feature = null;
            return result;
        });

};

WFS_Provider.prototype.GeoJSON2Polygon = function(features) {
    var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    var polyGroup = new THREE.Object3D();
    for (var r = 0; r < features.length; r++) {
        var positions = [];
        //var hauteur = (features[r].properties.hauteur) || 0;
        var polygon = features[r].geometry.coordinates[0][0];
        var altitude = features[r].properties.z_min; 
        if (polygon.length > 2 && altitude != 9999) {
            for (var j = 0; j < polygon.length; ++j) {
                var pt2DTab = polygon[j]; //.split(' ');
                //long et puis lat
                //var pt = new THREE.Vector3(parseFloat(pt2DTab[1]), hauteur, parseFloat(pt2DTab[0]));
                var coordCarto = new CoordCarto().setFromDegreeGeo(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), altitude);
                var spt = ellipsoid.cartographicToCartesian(coordCarto);
                positions.push( spt.x, spt.y, spt.z);
            }
            var geometry = new THREE.BufferGeometry();
            var material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent : true, opacity: 0.9}); //side:THREE.DoubleSide, , linewidth: 5,
                geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
                geometry.computeBoundingSphere();
            var poly = new THREE.Line( geometry, material );
                poly.frustumCulled = false;
            polyGroup.add(poly);    
            
        }
    }

    return polyGroup;
};

WFS_Provider.prototype.GeoJSON2BBox = function(features) {
    
    var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    var bboxGroup = new THREE.Object3D();
    var wallGeometry = new THREE.Geometry(); // for the walls
    var roofGeometry = new THREE.Geometry(); // for the roof
    var suppHeight = 10; // So we don't cut the roof
    var texture = new THREE.TextureLoader().load( 'data/strokes/wall-texture.jpg'); 
    
    for (var r = 0; r < features.length; r++) {

        var hauteur = (features[r].properties.hauteur + suppHeight) || 0;
        var altitude = features[r].properties.z_min;  
        var polygon = features[r].geometry.coordinates[0][0];
        var goodAltitude;
        
        if (polygon.length > 2) {
            
            if(altitude != 9999) goodAltitude = altitude;
            
            var arrPoint2D = [];
            // VERTICES
            for (var j = 0; j < polygon.length - 1; ++j) {

                var pt2DTab = polygon[j]; //.split(' ');
                
                var coordCarto1 = new CoordCarto().setFromDegreeGeo(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude);
                var coordCarto2 = new CoordCarto().setFromDegreeGeo(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude +hauteur);
                var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1); 
                var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);

                var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z); 
                var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);

                arrPoint2D.push(CVML.newPoint(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0])));
                //arrPoint2D.push(CVML.newPoint(pgeo2.x, pgeo2.y, pgeo2.z));
                
                wallGeometry.vertices.push(vector3_1, vector3_2);

            }

            // FACES
            // indice of the first point of the polygon 3D
            for (var k = wallGeometry.vertices.length - ((polygon.length - 1) * 2); k < wallGeometry.vertices.length; k = k + 2) {

                var l = k; // % (pts2DTab.length);
                if (l > wallGeometry.vertices.length - 4) {
                    l = wallGeometry.vertices.length - ((polygon.length - 1) * 2);
                }
                wallGeometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                wallGeometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
            }

            var ll = wallGeometry.vertices.length - ((polygon.length - 1) * 2);
            wallGeometry.faces.push(new THREE.Face3(ll, ll + 1, wallGeometry.vertices.length - 1));
            wallGeometry.faces.push(new THREE.Face3(ll, wallGeometry.vertices.length - 1, wallGeometry.vertices.length - 2));
        }
        
        wallGeometry.computeFaceNormals(); // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH
        
        //**************** ROOF ****************************
      
        var triangles = CVML.TriangulatePoly(arrPoint2D);
        triangles.forEach(function(t) {

            var pt1 = t.getPoint(0),
                pt2 = t.getPoint(1),
                pt3 = t.getPoint(2);

            var coordCarto1 = new CoordCarto().setFromDegreeGeo(pt1.x, pt1.y, goodAltitude + hauteur);
            var coordCarto2 = new CoordCarto().setFromDegreeGeo(pt2.x, pt2.y, goodAltitude + hauteur); // + Math.random(1000) );
            var coordCarto3 = new CoordCarto().setFromDegreeGeo(pt3.x, pt3.y, goodAltitude + hauteur);

            var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1); //{longitude:p1.z, latitude:p1.x, altitude: 0});
            var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);
            var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3);

            //var geometry = new THREE.Geometry();
            roofGeometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
            roofGeometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
            roofGeometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));

            var face = new THREE.Face3(
                roofGeometry.vertices.length - 3,
                roofGeometry.vertices.length - 2,
                roofGeometry.vertices.length - 1
            );
            roofGeometry.faces.push(face);

        });

    }

    roofGeometry.computeFaceNormals();
   
    var wallMat = new THREE.MeshBasicMaterial({  color: 0xcccccc, transparent: true, opacity: 0.8, side : THREE.DoubleSide});  // map : texture,
    var roofMat = new THREE.MeshBasicMaterial({color: 0x660000, transparent: true, opacity: 0.8, side : THREE.DoubleSide});

    var wall  = new THREE.Mesh(wallGeometry, wallMat);
        wall.frustumCulled = false;
    var roof  = new THREE.Mesh(roofGeometry, roofMat);
        roof.frustumCulled = false;

    bboxGroup.add(wall);
    bboxGroup.add(roof);

    return bboxGroup;
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
        bbox.west() + "," + bbox.south() + "," +
        bbox.east() + "," + bbox.north() +
        ",epsg:" + this.epsgCode + "&outputFormat=" + this.format;

    return url;
};

WFS_Provider.prototype.getData = function(bbox) {

    var url = this.url(bbox);
    return this.ioDriver_JSON.read(url);
};

*/
export default WFS_Provider;
