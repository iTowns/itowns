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
//import ItownsLine from 'Core/Commander/Providers/ItownsLine';
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

WFS_Provider.prototype.unmodifiedBBoxUrl = function(bbox, layer){
    var urld = layer.customUrl.replace('%bbox', bbox.minCarto.longitude + ',' + 
                                                bbox.minCarto.latitude  + ',' + 
                                                bbox.maxCarto.longitude + ',' + 
                                                bbox.maxCarto.latitude);
    return urld;
};

WFS_Provider.prototype.tmpLineTestUrl = function(coord, layer){
    var bbox =  coord.minCarto.latitude * 180.0 / Math.PI +
                "," +
                (coord.minCarto.longitude - Math.PI ) * 180.0 / Math.PI +
                "," +
                coord.maxCarto.latitude * 180.0 / Math.PI +
                "," +
                (coord.maxCarto.longitude - Math.PI ) * 180.0 / Math.PI;

    var urld = layer.customUrl.replace('%bbox', bbox.toString());
    return urld;
};

WFS_Provider.prototype.customUrl = function(url,coord) {
    //convert radian to degree, lon is added a offset of Pi
    //to align axisgit  to card center
    var bbox =  (coord.minCarto.longitude - Math.PI ) * 180.0 / Math.PI +
                "," +
                coord.minCarto.latitude * 180.0 / Math.PI +
                ","+
                (coord.maxCarto.longitude - Math.PI ) * 180.0 / Math.PI +
                "," +
                coord.maxCarto.latitude * 180.0 / Math.PI;

    var urld = url.replace('%bbox',bbox.toString());

    return urld;

};

WFS_Provider.prototype.preprocessDataLayer = function(layer){
    if(!layer.title)
        throw new Error('layerName is required.');

    layer.format = defaultValue(layer.options.mimetype, "json"),
    layer.crs = defaultValue(layer.projection, "EPSG:4326"),
    layer.version = defaultValue(layer.version, "1.3.0"),
    layer.bbox = defaultValue(layer.bbox, [-180, -90, 180, 90]);
    layer.customUrl = layer.url +
                  'SERVICE=WFS&REQUEST=GetFeature&typeName=' + layer.title +
                  '&VERSION=' + layer.version +
                  '&outputFormat=' + layer.format +
                  '&BBOX=%bbox,' + layer.crs;

    this.tileParams = layer.params || undefined;

    if(this.tileParams !== undefined) {
        var obj = this.tileParams.point || this.tileParams.line || this.tileParams.box || this.tileParams.polygon || undefined;
        if(obj !== undefined) {
            this.radius         = obj.radius        || 10;
            this.nbSegment      = obj.nbSegment     || 3;
            this.thetaStart     = obj.thetaStart    || 0;
            this.thetaLength    = obj.thetaLength   || 2 * Math.PI;
            this.offsetValue    = obj.length        || 10;

            this.boxWidth       = obj.bowWidth      || 40000;
            this.boxHeight      = obj.boxHeight     || 800000;

            //Must convert all data to hexadecimal values because datas are automatically
            //converted in decimal values between the index.html and the next JS function
            if(obj.color !== undefined && obj.color.colorTab !== undefined)
                for (var i = 0; i < obj.color.colorTab.length; i++)
                    obj.color.colorTab[i].toString(16);
        }
    }
};

WFS_Provider.prototype.tileInsideLimit = function(tile,layer) {
    var bbox = tile.bbox;
    var level = tile.level;
    //console.log(level);
    // shifting longitude because of issue #19
    var west =  layer.bbox[0]*Math.PI/180.0 + Math.PI;
    var east =  layer.bbox[2]*Math.PI/180.0 + Math.PI;
    var bboxRegion = new BoundingBox(west, east, layer.bbox[1]*Math.PI/180.0, layer.bbox[3]*Math.PI/180.0, 0, 0, 0);

    return (level == 18) && bboxRegion.intersect(bbox);
};

WFS_Provider.prototype.executeCommand = function(command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    //TODO : support xml, gml2, geojson
    var supportedFormats = {
        json:    this.getFeatures.bind(this),
        geojson: this.getFeatures.bind(this)
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
    if (!this.tileInsideLimit(tile,layer) || tile.material === null)
        return Promise.resolve();

    var pitch = parameters.ancestor ?
        this.projection.WMS_WGS84Parent(tile.bbox, parameters.ancestor.bbox) :
        new THREE.Vector3(0, 0, 1);

    var url;
    var bbox = parameters.ancestor ?
                parameters.ancestor.bbox :
                tile.bbox;

    if (layer.type == "point" || layer.type == "line")
        url = this.tmpLineTestUrl(bbox, layer);
    else
        url = this.url(bbox, layer);

    var result = {pitch: pitch };
    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined) 
        return Promise.resolve(result);

    return this._IoDriver.read(url).then(function(feature) {

        if(feature.crs || layer.crs) {
            var features = feature.features;
            if(layer.type == "poly")
                result.feature = this.GeoJSON2Polygon(features);
            else if(layer.type == "bbox")
                result.feature = this.GeoJSON2BBox(features);
            else if(layer.type == "point"){
                result.feature = this.GeoJSON2Point(features, bbox);
            } else if(layer.type == "line"){
                var tmpBbox = new BoundingBox((bbox.minCarto.longitude - Math.PI ) * 180.0 / Math.PI,
                                                (bbox.maxCarto.longitude - Math.PI ) * 180.0 / Math.PI,
                                                bbox.minCarto.latitude * 180.0 / Math.PI,
                                                bbox.maxCarto.latitude * 180.0 / Math.PI,
                                                bbox.minCarto.altitude, bbox.maxCarto.altitude);
                result.feature = this.GeoJSON2Line(features, tmpBbox);
            }

            if (result.feature !== undefined)
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
    //var texture = new THREE.TextureLoader().load( 'data/strokes/wall-texture.jpg');

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
                var coordCarto2 = new CoordCarto().setFromDegreeGeo(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude + hauteur);
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

    var wallMat = new THREE.MeshBasicMaterial({color: 0xcccccc, transparent: true, opacity: 0.8, side : THREE.DoubleSide});  // map : texture,
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
 * Permit to cut a line at the end of the tile.
 * @param coords: the coords which are tested
 * @param slope: the slope of the current portion of line
 * @param rest:
 * @param bbox; the tile bounding box
 */
WFS_Provider.prototype.cutLine = function(coords, slope, rest, bbox) {

    if(coords[0] < bbox.minCarto.longitude){
        coords[0] = bbox.minCarto.longitude;
        if(coords[1] >= bbox.minCarto.latitude && coords[1] <= bbox.maxCarto.latitude)
            coords[1] = slope * coords[0] + rest;
    }
    else if (coords[0] > bbox.maxCarto.longitude){
        coords[0] = bbox.maxCarto.longitude;
        if(coords[1] >= bbox.minCarto.latitude && coords[1] <= bbox.maxCarto.latitude)
            coords[1] = slope * coords[0] + rest;
    }
    if(coords[1] < bbox.minCarto.latitude){
        coords[1] = bbox.minCarto.latitude;
        if(coords[0] >= bbox.minCarto.longitude && coords[0] <= bbox.maxCarto.longitude)
            coords[0] = (coords[1] - rest) / slope;
    }
    else if (coords[1] > bbox.maxCarto.latitude){
        coords[1] = bbox.maxCarto.latitude;
        if(coords[0] >= bbox.minCarto.longitude && coords[0] <= bbox.maxCarto.longitude)
            coords[0] = (coords[1] - rest) / slope;
    }
}

/**
 * From a single point, the direction of the line and the orientation of the tile
 * compute the two points which will be on the border of the line.
 * @param pt1: one point of the line
 * @param pt2: another point of the line
 * @param isFirstPt: permit to choose to which point we will compute the border points
 */
WFS_Provider.prototype.computeLineBorderPoints = function(pt1, pt2, isFirstPt) {

    var size        = {x:6378137,y: 6356752.3142451793,z:6378137};
    var ellipsoid   = new Ellipsoid(size);

    var coordCarto1 = new CoordCarto().setFromDegreeGeo(pt1.x, pt1.y, pt1.z);
    var coordCarto2 = new CoordCarto().setFromDegreeGeo(pt2.x, pt2.y, pt2.z);

    var cart1 = ellipsoid.cartographicToCartesian(coordCarto1);
    var cart2 = ellipsoid.cartographicToCartesian(coordCarto2);

    var dx      = cart2.x - cart1.x;
    var dy      = cart2.y - cart1.y;
    var dz      = cart2.z - cart1.z;

    var direct  = new THREE.Vector3(dx, dy, dz);
    direct.normalize();
    var normalGlobe = ellipsoid.geodeticSurfaceNormalCartographic(coordCarto1);
    normalGlobe.normalize();

    normalGlobe.cross(direct);
    normalGlobe.normalize();

    //Compute offset to find the left and right point with the given offset value
    var offsetX = normalGlobe.x * this.offsetValue;
    var offsetY = normalGlobe.y * this.offsetValue;
    var offsetZ = normalGlobe.z * this.offsetValue;

    //The first point left and point right of the line
    var left, right;
    if(isFirstPt){
        left    = new THREE.Vector3(cart1.x - offsetX, cart1.y - offsetY, cart1.z - offsetZ);
        right   = new THREE.Vector3(cart1.x + offsetX, cart1.y + offsetY, cart1.z + offsetZ);
    } else {
        left    = new THREE.Vector3(cart2.x - offsetX, cart2.y - offsetY, cart2.z - offsetZ);
        right   = new THREE.Vector3(cart2.x + offsetX, cart2.y + offsetY, cart2.z + offsetZ);
    }
    return {left: left, right: right};
}

/**
 * Process the data received from a WFS request with a tile of feature type 'Line'.
 * Can be used whe the type of the feature tile is a Grid and not a quadTree
 * @param value: the JSON object which contains the data received from the WFS request
 * @param geometry: the geometry used to set the tile geometry
 */
WFS_Provider.prototype.GeoJSON2Line = function(features, bbox) {

    var geometry = new THREE.Geometry();

    for (var i = 0; i < features.length; i++) {
        var feature     = features[i];
        var coords      = feature.geometry.coordinates;

        var j = 0;
        var isInsideTile = false;

        //Cut the line according to the tiles limits
        //May not be usefull if we can cut the line before inside the request to the WFS provider
        do{
            if (coords[j][0] < bbox.minCarto.longitude || coords[j][0] > bbox.maxCarto.longitude
                || coords[j][1] < bbox.minCarto.latitude || coords[j][1] > bbox.maxCarto.latitude) {
                var coeffSlope, rest;
                if(isInsideTile) {
                    coeffSlope = (coords[j][1] - coords[j - 1][1]) / (coords[j][0] - coords[j - 1][0]);
                    rest = coords[j][1] - coeffSlope * coords[j][0];

                    this.cutLine(coords[j], coeffSlope, rest, bbox);

                    j++;
                } else if (coords[j+1] != undefined
                    && (coords[j + 1][0] > bbox.minCarto.longitude && coords[j + 1][0] < bbox.maxCarto.longitude
                    &&  coords[j + 1][1] > bbox.minCarto.latitude  && coords[j + 1][1] < bbox.maxCarto.latitude)) {

                    coeffSlope = (coords[j + 1][1] - coords[j][1]) / (coords[j + 1][0] - coords[j][0]);
                    rest = coords[j + 1][1] - coeffSlope * coords[j + 1][0];

                    this.cutLine(coords[j], coeffSlope, rest, bbox);

                    j = j + 2;
                } else {
                    coords.splice(j, 1);
                }
                isInsideTile = false;
            } else {
                isInsideTile = true;
                j++;
            }
        }while (j < coords.length);

        if(coords.length > 1){
            var resp = this.computeLineBorderPoints(new THREE.Vector3(coords[0][0], coords[0][1], 180/*(bbox.minCarto.altitude + bbox.maxCarto.altitude / 2) + 5*/),
                                                    new THREE.Vector3(coords[1][0], coords[1][1], 180/*(bbox.minCarto.altitude + bbox.maxCarto.altitude / 2) + 5*/), true);

            for (j = 0; j < coords.length - 1; j++) {
                var currentGeometry = new THREE.Geometry();
                currentGeometry.vertices.push(resp.left, resp.right);

                resp = this.computeLineBorderPoints(new THREE.Vector3(coords[j][0],     coords[j][1], 180/*(bbox.minCarto.altitude + bbox.maxCarto.altitude / 2) + 5*/),
                                                    new THREE.Vector3(coords[j + 1][0], coords[j + 1][1], 180/*(bbox.minCarto.altitude + bbox.maxCarto.altitude / 2) + 5*/), false);

                currentGeometry.vertices.push(resp.left, resp.right);

                currentGeometry.faces.push( new THREE.Face3(0, 2, 1),
                                            new THREE.Face3(2, 3, 1));

                geometry.computeFaceNormals();
                geometry.computeVertexNormals();

                for (var k = 0; k < currentGeometry.faces.length; k++)
                    this.manageMaterial(feature.properties, currentGeometry.faces[k].color);

                geometry.merge(currentGeometry);
            }
        }
    }

    if(geometry.vertices.length !== 0) {
        var mat = new THREE.MeshBasicMaterial({color: 0xFEFE54, transparent: true, opacity: 0.8, side : THREE.DoubleSide});
        var mesh = new THREE.Mesh(geometry, mat);
        var group = new THREE.Object3D();
        group.add(mesh);
        return group;
    } else
        return undefined;
}

/**
 * Create the entire geometry of the object passed in. Is use to create feature geometry
 * like points or boxes.
 * @param value: the JSON object which contains the data received from the WFS request
 * @param geometry: the geometry used to set the tile geometry
 */
WFS_Provider.prototype.GeoJSON2Point = function(features, bbox) {

    var geometry = new THREE.Geometry();
    var group = new THREE.Object3D();

    var size        = {x:6378137,y: 6356752.3142451793,z:6378137};
    var ellipsoid   = new Ellipsoid(size);

    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var coords = feature.geometry.coordinates;
        var offsetZ = Math.random();

        var coordCarto = new CoordCarto().setFromDegreeGeo(coords[0], coords[1], ((bbox.minCarto.altitude + bbox.maxCarto.altitude) / 2) + 3);
        var normalGlobe = ellipsoid.geodeticSurfaceNormalCartographic(coordCarto);
        var centerPoint = ellipsoid.cartographicToCartesian(coordCarto);

        var currentGeometry;
        //Change the type of height and radius computation. Used only for the test purpose
        if(this.tileParams.box !== undefined) {
            var tmp = feature.properties[this.tileParams.box.heightParam]; 
            if(tmp !== undefined && tmp !== 0)
                currentGeometry = new THREE.BoxGeometry(this.boxWidth, this.boxWidth, 800000 * (1 / tmp));
            else
                currentGeometry = new THREE.BoxGeometry(this.boxWidth, this.boxWidth, 100000 * feature.properties[this.tileParams.box.heightParam]);
        } else if(this.tileParams.point !== undefined) {
            var tmp = feature.properties[this.tileParams.point.heightParam];
            if(tmp !== undefined && tmp !== 0)
                currentGeometry = new THREE.CircleGeometry(this.radius * (1 / tmp), this.nbSegment, this.thetaStart, this.thetaLength);
            else
                currentGeometry = new THREE.CircleGeometry(this.radius, this.nbSegment, this.thetaStart, this.thetaLength);
        } else
            continue;

        currentGeometry.lookAt(normalGlobe);
        currentGeometry.translate(centerPoint.x, centerPoint.y, centerPoint.z);

        for (var j = 0; j < currentGeometry.faces.length; j++)
            this.manageMaterial(feature.properties, currentGeometry.faces[j].color);

        geometry.merge(currentGeometry);
    }

    var mat = new THREE.MeshBasicMaterial({color: 0x54FEE8, transparent: true, opacity: 0.8, side : THREE.DoubleSide});
    var mesh = new THREE.Mesh(geometry, mat);
    group.add(mesh);
    return group;
}

/**
 * Manage the feature material. The management is done depending on the type of feature
 * you want to display.
 * @param featureProperties: properties specified for the current feature
 * @param color: the color to set inside the current feature geometry
 */
WFS_Provider.prototype.manageMaterial = function(featureProperties, color) {

    var getType = {};

    if(this.tileParams.point !== undefined){
        if(this.tileParams.point && getType.toString.call(this.tileParams.point) === '[object Function]')
            this.tileParams.point(featureProperties);
        else
            this.manageColor(featureProperties, color, this.tileParams.point);
    } else if (this.tileParams.line !== undefined) {
        if(this.tileParams.line && getType.toString.call(this.tileParams.line) === '[object Function]')
            this.tileParams.line(featureProperties, this.tileParams);
        else
            this.manageColor(featureProperties, color, this.tileParams.line);
    }else if (this.tileParams.box !== undefined) {
        if(this.tileParams.box && getType.toString.call(this.tileParams.box) === '[object Function]')
            this.tileParams.box(featureProperties, this.tileParams);
        else
            this.manageColor(featureProperties, color, this.tileParams.box);
    } /*else if (this.tileParams.polygon !== undefined){

    }*/
}

/**
 * Manage to put the colors inside the color manager for a feature type 'Point'.
 * @param properties: properties of the feature
 * @param color : manager of the color of a face
 * @params tileParams: the tile to which apply the geometry
 */
WFS_Provider.prototype.manageColor = function(properties, color, tileParams) {

    var colorParams = tileParams.color;

    for (var i = 0; i < colorParams.testTab.length; i++) {
        if(properties[colorParams.property] === colorParams.testTab[i]){
            color.setHex(colorParams.colorTab[i]);
            return;
        }
    }
    color.setHex(new THREE.Color(0xFFFFFF));
}

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
