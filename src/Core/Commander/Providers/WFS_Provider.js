/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import * as THREE from 'three';
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';
import FeatureMesh from 'Renderer/FeatureMesh';
import Provider from 'Core/Commander/Providers/Provider';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import BoundingBox from 'Scene/BoundingBox';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CVML from 'Core/Math/CVML';
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
function WFS_Provider(/* options*/) {
    this.cache = CacheRessource();
    this.projection = new Projection();

    this.size = { x: 6378137, y: 6356752.3142451793, z: 6378137 };
    this.ellipsoid = new Ellipsoid(this.size);
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function (coord, layer) {
    var bbox;
    if (layer.type == 'point' || layer.type == 'line' || layer.type == 'box')
        { bbox = `${coord.south(UNIT.DEGREE)},${coord.west(UNIT.DEGREE)},${
                coord.north(UNIT.DEGREE)},${coord.east(UNIT.DEGREE)}`; }
    else
        { bbox = `${coord.west(UNIT.DEGREE)},${coord.south(UNIT.DEGREE)},${
                coord.east(UNIT.DEGREE)},${coord.north(UNIT.DEGREE)}`; }
    var urld = layer.customUrl.replace('%bbox', bbox.toString());
    return urld;
};

WFS_Provider.prototype.preprocessDataLayer = function (layer) {
    if (!layer.title)
        { throw new Error('layerName is required.'); }

    layer.format = defaultValue(layer.options.mimetype, 'json');
    layer.crs = defaultValue(layer.projection, 'EPSG:4326');
    layer.version = defaultValue(layer.version, '1.3.0');
    layer.bbox = defaultValue(layer.bbox, [-180, -90, 90, 180]);
    layer.customUrl = `${layer.url
                      }SERVICE=WFS&REQUEST=GetFeature&typeName=${layer.title
                      }&VERSION=${layer.version
                      }&outputFormat=${layer.format
                      }&BBOX=%bbox,${layer.crs}`;
};

WFS_Provider.prototype.tileInsideLimit = function (tile, layer) {
    var bbox = new BoundingBox(layer.bbox[0], layer.bbox[2], layer.bbox[1], layer.bbox[3], 0, 0, UNIT.DEGREE);
    return (tile.level == 17) && bbox.intersect(tile.bbox);
};

WFS_Provider.prototype.executeCommand = function (command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    // TODO : support xml, gml2, geojson
    var supportedFormats = {
        json: this.getFeatures.bind(this),
        geojson: this.getFeatures.bind(this),
    };

    var func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer, command.paramsFunction, command.requester).then(result => command.resolve(result));
    } else {
        return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
    }
};


WFS_Provider.prototype.getFeatures = function (tile, layer, parameters, parent) {
    if (!this.tileInsideLimit(tile, layer) || tile.material === null)
        { return Promise.resolve(); }

    var pitch = parameters.ancestor ?
                this.projection.WMS_WGS84Parent(tile.bbox, parameters.ancestor.bbox) :
                new THREE.Vector3(0, 0, 1);
    var bbox = parameters.ancestor ?
                parameters.ancestor.bbox :
                tile.bbox;

    var geometry,
        params,
        builder,
        mesh;

    if (layer.type == 'point' || layer.type == 'line' || layer.type == 'box') {
        geometry = new THREE.Geometry();
        params = { bbox, level: parent.level + 1, segment: 16, center: null, projected: null, protocol: parent.protocol };
        builder = new BuilderEllipsoidTile(this.ellipsoid, this.projection);
        mesh = new FeatureMesh(params, builder);
    }
    var url = this.url(bbox, layer);

    var result = { pitch };

    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined) {
        return Promise.resolve(result);
    }
    return Fetcher.json(url).then((feature) => {
        if (feature.crs || layer.crs) {
            var features = feature.features;

            if (layer.type == 'poly')
                { result.feature = this.GeoJSON2Polygon(features); }
            else if (layer.type == 'bbox')
                { result.feature = this.GeoJSON2Box(features); }
            else if (layer.type == 'point' || layer.type == 'box') {
                this.GeoJSON2Point(features, bbox, geometry, layer);
                mesh.setGeometry(geometry);
                result.feature = mesh;
            } else if (layer.type == 'line') {
                var tmpBbox = new BoundingBox(bbox.west() * 180.0 / Math.PI,
                                                bbox.east() * 180.0 / Math.PI,
                                                bbox.south() * 180.0 / Math.PI,
                                                bbox.north() * 180.0 / Math.PI,
                                                bbox.bottom(), bbox.top());
                this.GeoJSON2Line(features, tmpBbox, geometry, layer);
                mesh.setGeometry(geometry);
                result.feature = mesh;
            }

            if (result.feature !== undefined)
                { this.cache.addRessource(url, result.feature); }
        }

        return result;
    }).catch((/* reason*/) => {
        result.feature = null;
        return result;
    });
};

WFS_Provider.prototype.GeoJSON2Polygon = function (features) {
    var polyGroup = new THREE.Object3D();
    for (var r = 0; r < features.length; r++) {
        var positions = [];
        // var hauteur = (features[r].properties.hauteur) || 0;
        var polygon = features[r].geometry.coordinates[0][0];
        var altitude = features[r].properties.z_min;
        if (polygon.length > 2 && altitude != 9999) {
            for (var j = 0; j < polygon.length; ++j) {
                var pt2DTab = polygon[j]; // .split(' ');
                // long et puis lat
                // var pt = new THREE.Vector3(parseFloat(pt2DTab[1]), hauteur, parseFloat(pt2DTab[0]));
                var geoCoord = new GeoCoordinate(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), altitude, UNIT.DEGREE);
                var spt = this.ellipsoid.cartographicToCartesian(geoCoord);
                positions.push(spt.x, spt.y, spt.z);
            }
            var geometry = new THREE.BufferGeometry();
            var material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 }); // side:THREE.DoubleSide, , linewidth: 5,
            geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
            geometry.computeBoundingSphere();
            var poly = new THREE.Line(geometry, material);

            poly.frustumCulled = false;
            polyGroup.add(poly);
        }
    }

    return polyGroup;
};

WFS_Provider.prototype.GeoJSON2Box = function (features) {
    var bboxGroup = new THREE.Object3D();
    var wallGeometry = new THREE.Geometry(); // for the walls
    var roofGeometry = new THREE.Geometry(); // for the roof
    var suppHeight = 10; // So we don't cut the roof
    // var texture = new THREE.TextureLoader().load( 'data/strokes/wall-texture.jpg');

    for (var r = 0; r < features.length; r++) {
        var hauteur = (features[r].properties.hauteur + suppHeight) || 0;
        var altitude = features[r].properties.z_min;
        var polygon = features[r].geometry.coordinates[0][0];
        var goodAltitude;

        if (polygon.length > 2) {
            if (altitude != 9999) goodAltitude = altitude;

            var arrPoint2D = [];
            // VERTICES
            for (var j = 0; j < polygon.length - 1; ++j) {
                var pt2DTab = polygon[j]; // .split(' ');

                var geoCoord1 = new GeoCoordinate(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude, UNIT.DEGREE);
                var geoCoord2 = new GeoCoordinate(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude + hauteur, UNIT.DEGREE);
                var pgeo1 = this.ellipsoid.cartographicToCartesian(geoCoord1);
                var pgeo2 = this.ellipsoid.cartographicToCartesian(geoCoord2);

                var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z);
                var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);

                arrPoint2D.push(CVML.newPoint(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0])));
                // arrPoint2D.push(CVML.newPoint(pgeo2.x, pgeo2.y, pgeo2.z));

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

        //* *************** ROOF ****************************

        var triangles = CVML.TriangulatePoly(arrPoint2D);
        triangles.forEach((t) => {
            var pt1 = t.getPoint(0),
                pt2 = t.getPoint(1),
                pt3 = t.getPoint(2);

            var geoCoord1 = new GeoCoordinate(pt1.x, pt1.y, goodAltitude + hauteur, UNIT.DEGREE);
            var geoCoord2 = new GeoCoordinate(pt2.x, pt2.y, goodAltitude + hauteur, UNIT.DEGREE);
            var geoCoord3 = new GeoCoordinate(pt3.x, pt3.y, goodAltitude + hauteur, UNIT.DEGREE);

            var pgeo1 = this.ellipsoid.cartographicToCartesian(geoCoord1); // {longitude:p1.z, latitude:p1.x, altitude: 0});
            var pgeo2 = this.ellipsoid.cartographicToCartesian(geoCoord2);
            var pgeo3 = this.ellipsoid.cartographicToCartesian(geoCoord3);

            // var geometry = new THREE.Geometry();
            roofGeometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
            roofGeometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
            roofGeometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));

            var face = new THREE.Face3(
                roofGeometry.vertices.length - 3,
                roofGeometry.vertices.length - 2,
                roofGeometry.vertices.length - 1);
            roofGeometry.faces.push(face);
        });
    }

    roofGeometry.computeFaceNormals();

    var wallMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.8, side: THREE.DoubleSide });  // map : texture,
    var roofMat = new THREE.MeshBasicMaterial({ color: 0x660000, transparent: true, opacity: 0.8, side: THREE.DoubleSide });

    var wall = new THREE.Mesh(wallGeometry, wallMat);
    wall.frustumCulled = false;
    var roof = new THREE.Mesh(roofGeometry, roofMat);
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
WFS_Provider.prototype.cutLine = function (coords, slope, rest, bbox) {
    var minLong = bbox.west(),
        maxLong = bbox.east(),
        minLat = bbox.south(),
        maxLat = bbox.north();
    if (coords[0] < minLong) {
        coords[0] = minLong;
        if (coords[1] >= minLat && coords[1] <= maxLat)
            { coords[1] = slope * coords[0] + rest; }
    }
    else if (coords[0] > maxLong) {
        coords[0] = maxLong;
        if (coords[1] >= minLat && coords[1] <= maxLat)
            { coords[1] = slope * coords[0] + rest; }
    }
    if (coords[1] < minLat) {
        coords[1] = minLat;
        if (coords[0] >= minLong && coords[0] <= maxLong)
            { coords[0] = (coords[1] - rest) / slope; }
    }
    else if (coords[1] > maxLat) {
        coords[1] = maxLat;
        if (coords[0] >= minLong && coords[0] <= maxLong)
            { coords[0] = (coords[1] - rest) / slope; }
    }
};

/**
 * From a single point, the direction of the line and the orientation of the tile
 * compute the two points which will be on the border of the line.
 * @param pt1: one point of the line
 * @param pt2: another point of the line
 * @param isFirstPt: permit to choose to which point we will compute the border points
 * @param offsetValue: Half value of the line size
 */
WFS_Provider.prototype.computeLineBorderPoints = function (pt1, pt2, isFirstPt, offsetValue) {
    var geoCoord1 = new GeoCoordinate(pt1.x, pt1.y, pt1.z, UNIT.DEGREE);
    var geoCoord2 = new GeoCoordinate(pt2.x, pt2.y, pt2.z, UNIT.DEGREE);

    var cart1 = this.ellipsoid.cartographicToCartesian(geoCoord1);
    var cart2 = this.ellipsoid.cartographicToCartesian(geoCoord2);

    var dx = cart2.x - cart1.x;
    var dy = cart2.y - cart1.y;
    var dz = cart2.z - cart1.z;

    var direct = new THREE.Vector3(dx, dy, dz);
    direct.normalize();
    var normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(geoCoord1);
    normalGlobe.normalize();

    normalGlobe.cross(direct);
    normalGlobe.normalize();

    // Compute offset to find the left and right point with the given offset value
    var offsetX = normalGlobe.x * offsetValue;
    var offsetY = normalGlobe.y * offsetValue;
    var offsetZ = normalGlobe.z * offsetValue;

    // The first point left and point right of the line
    var left,
        right;
    if (isFirstPt) {
        left = new THREE.Vector3(cart1.x - offsetX, cart1.y - offsetY, cart1.z - offsetZ);
        right = new THREE.Vector3(cart1.x + offsetX, cart1.y + offsetY, cart1.z + offsetZ);
    } else {
        left = new THREE.Vector3(cart2.x - offsetX, cart2.y - offsetY, cart2.z - offsetZ);
        right = new THREE.Vector3(cart2.x + offsetX, cart2.y + offsetY, cart2.z + offsetZ);
    }
    return { left, right };
};

/**
 * Process the data received from a WFS request with a tile of feature type 'Line'.
 * Can be used whe the type of the feature tile is a Grid and not a quadTree
 * @param value: the JSON object which contains the data received from the WFS request
 * @param geometry: the geometry used to set the tile geometry
 */
WFS_Provider.prototype.GeoJSON2Line = function (features, bbox, geometry, layer) {
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var coords = feature.geometry.coordinates;

        var j = 0;
        var inTile = false;


        // Cut the line according to the tiles limits
        // May not be usefull if we can cut the line before inside the request to the WFS provider
        do {
            var c_1 = coords[j - 1],
                c = coords[j],
                cX = c[0],
                cY = c[1],
                c1 = coords[j + 1];
            if (c_1 != undefined) { var c_1X = c_1[0],
                c_1Y = c_1[1]; }
            if (c1 != undefined) { var c1X = c1[0],
                c1Y = c1[1]; }
            var minLong = bbox.west(),
                maxLong = bbox.east(),
                minLat = bbox.south(),
                maxLat = bbox.north();

            if (cX < minLong || cX > maxLong || cY < minLat || cY > maxLat) {
                var coeffSlope,
                    rest;
                if (inTile) {
                    coeffSlope = (cY - c_1Y) / (cX - c_1X);
                    rest = cY - coeffSlope * cX;

                    this.cutLine(c, coeffSlope, rest, bbox);
                    j++;
                } else if (c1 != undefined && c1X > minLong && c1X < maxLong && c1Y > minLat && c1Y < maxLat) {
                    coeffSlope = (c1Y - cY) / (c1X - cX);
                    rest = c1Y - coeffSlope * c1X;

                    this.cutLine(c, coeffSlope, rest, bbox);
                    j++;
                } else
                    { coords.splice(j, 1); }
                inTile = false;
            } else {
                inTile = true;
                j++;
            }
        } while (j < coords.length);

        if (coords.length > 1) {
            var resp = this.computeLineBorderPoints(new THREE.Vector3(coords[0][0], coords[0][1], 180),
                                                    new THREE.Vector3(coords[1][0], coords[1][1], 180),
                                                    true, layer.params.length || 10);

            for (j = 0; j < coords.length - 1; j++) {
                var currentGeometry = new THREE.Geometry();
                currentGeometry.vertices.push(resp.left, resp.right);

                resp = this.computeLineBorderPoints(new THREE.Vector3(coords[j][0], coords[j][1], 180),
                                                    new THREE.Vector3(coords[j + 1][0], coords[j + 1][1], 180),
                                                    false, layer.params.length || 10);

                currentGeometry.vertices.push(resp.left, resp.right);

                currentGeometry.faces.push(new THREE.Face3(0, 2, 1),
                                            new THREE.Face3(2, 3, 1));

                geometry.computeFaceNormals();
                geometry.computeVertexNormals();

                for (var k = 0; k < currentGeometry.faces.length; k++)
                    { this.manageColor(feature.properties, currentGeometry.faces[k].color, layer); }

                geometry.merge(currentGeometry);
            }
        }
    }
};

/**
 * Create the entire geometry of the object passed in. Is use to create feature geometry
 * like points or boxes.
 * @param value: the JSON object which contains the data received from the WFS request
 * @param geometry: the geometry used to set the tile geometry
 */
WFS_Provider.prototype.GeoJSON2Point = function (features, bbox, geometry, layer) {
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var coords = feature.geometry.coordinates;

        var geoCoord = new GeoCoordinate(coords[0], coords[1], ((bbox.bottom() + bbox.top()) / 2) + 3, UNIT.DEGREE);
        var normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
        var centerPoint = this.ellipsoid.cartographicToCartesian(geoCoord);

        var currentGeometry;
        // Change the type of height and radius computation. Used only for the test purpose
        var params = layer.params;
        if (layer.type == 'box')
            { currentGeometry = new THREE.BoxGeometry(params.boxWidth || 40, params.boxWidth || 40, params.boxHeight || 80); }
        else if (layer.type == 'point')
            { currentGeometry = new THREE.CircleGeometry(params.radius || 10, params.nbSegment || 3, params.thetaStart || 0, params.thetaLength || 2 * Math.PI); }
        else
            { continue; }

        currentGeometry.lookAt(normalGlobe);
        currentGeometry.translate(centerPoint.x, centerPoint.y, centerPoint.z);

        for (var j = 0; j < currentGeometry.faces.length; j++)
            { this.manageColor(feature.properties, currentGeometry.faces[j].color, layer); }

        geometry.merge(currentGeometry);
    }
};

/**
 * Manage to put the colors inside the color manager for a feature type 'Point'.
 * @param properties: properties of the feature
 * @param color : manager of the color of a face
 * @params tileParams: the tile to which apply the geometry
 */
WFS_Provider.prototype.manageColor = function (properties, color, layer) {
    var colorParams = layer.params.color || undefined;

    if (colorParams !== undefined)
        { for (var i = 0; i < colorParams.testTab.length; i++) {
            if (properties[colorParams.property] === colorParams.testTab[i]) {
                color.setHex(colorParams.colorTab[i]);
                return;
            }
        } }
    color.setHex(new THREE.Color(0xFFFFFF));
};

export default WFS_Provider;
