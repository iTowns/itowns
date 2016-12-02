/**
 * Generated On: 2016-09-28
 * Class: FeatureToolBox
 * Description:
 */

import * as THREE from 'three';
import Earcut from 'earcut';
import BoundingBox from 'Scene/BoundingBox';
import Ellipsoid from 'Core/Math/Ellipsoid';
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';

function FeatureToolBox() {
    this.size = { x: 6378137, y: 6356752.3142451793, z: 6378137 };
    this.ellipsoid = new Ellipsoid(this.size);
}

FeatureToolBox.prototype.GeoJSON2Polygon = function (features, pointOrder) {
    var polyGroup = new THREE.Object3D();
    for (var r = 0; r < features.length; r++) {
        var positions = [];
        var polygon = features[r].geometry.coordinates[0][0];
        var altitude = features[r].properties.z_min;
        if (polygon.length > 2 && altitude != 9999) {
            for (var j = 0; j < polygon.length; ++j) {
                var pt2DTab = polygon[j]; // .split(' ');
                // long et puis lat
                var geoCoord = new GeoCoordinate(parseFloat(pt2DTab[pointOrder.long]), parseFloat(pt2DTab[pointOrder.lat]), altitude, UNIT.DEGREE);
                var spt = this.tool.ellipsoid.cartographicToCartesian(geoCoord);
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

FeatureToolBox.prototype.GeoJSON2Box = function (features, pointOrder) {
    var bboxGroup = new THREE.Object3D();
    var wallGeometry = new THREE.Geometry(); // for the walls
    var roofGeometry = new THREE.Geometry(); // for the roof
    var suppHeight = 10; // So we don't cut the roof
    var lastGoodAltitude = 0; // used for new bati if new bati does not have good altitude (occur offently in RGE)

    for (var r = 0; r < features.length; r++) {
        var hauteur = (features[r].properties.hauteur + suppHeight) || 0;
        var altitude = features[r].properties.z_min;
        var polygon = features[r].geometry.coordinates[0][0];
        var goodAltitude;

        if (polygon.length > 2) {
            if (altitude != 9999) {
                goodAltitude = altitude;
                lastGoodAltitude = goodAltitude; // save last good altitude
            } else {
                goodAltitude = lastGoodAltitude;
            }
            var arrPoint2D = [];
            // VERTICES
            for (var j = 0; j < polygon.length - 1; ++j) {
                var pt2DTab = polygon[j]; // .split(' ');

                var geoCoord1 = new GeoCoordinate(parseFloat(pt2DTab[pointOrder.long]), parseFloat(pt2DTab[pointOrder.lat]), goodAltitude, UNIT.DEGREE);
                var geoCoord2 = new GeoCoordinate(parseFloat(pt2DTab[pointOrder.long]), parseFloat(pt2DTab[pointOrder.lat]), goodAltitude + hauteur, UNIT.DEGREE);
                var pgeo1 = this.ellipsoid.cartographicToCartesian(geoCoord1);
                var pgeo2 = this.ellipsoid.cartographicToCartesian(geoCoord2);

                var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z);
                var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);

                arrPoint2D.push(parseFloat(pt2DTab[pointOrder.long]), parseFloat(pt2DTab[pointOrder.lat]));
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

        var triangles = Earcut(arrPoint2D);
        for (var i = 0; i < triangles.length; i += 3) {
            var pt1 = new THREE.Vector2(arrPoint2D[triangles[i] * 2], arrPoint2D[triangles[i] * 2 + 1]);
            var pt2 = new THREE.Vector2(arrPoint2D[triangles[i + 1] * 2], arrPoint2D[triangles[i + 1] * 2 + 1]);
            var pt3 = new THREE.Vector2(arrPoint2D[triangles[i + 2] * 2], arrPoint2D[triangles[i + 2] * 2 + 1]);
            var c1 = new GeoCoordinate(pt1.x, pt1.y, goodAltitude + hauteur, UNIT.DEGREE);
            var c2 = new GeoCoordinate(pt2.x, pt2.y, goodAltitude + hauteur, UNIT.DEGREE);
            var c3 = new GeoCoordinate(pt3.x, pt3.y, goodAltitude + hauteur, UNIT.DEGREE);

            var p1 = this.ellipsoid.cartographicToCartesian(c1); // {longitude:p1.z, latitude:p1.x, altitude: 0});
            var p2 = this.ellipsoid.cartographicToCartesian(c2);
            var p3 = this.ellipsoid.cartographicToCartesian(c3);

            roofGeometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
            roofGeometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));
            roofGeometry.vertices.push(new THREE.Vector3(p3.x, p3.y, p3.z));

            var face = new THREE.Face3(
                roofGeometry.vertices.length - 3,
                roofGeometry.vertices.length - 2,
                roofGeometry.vertices.length - 1);
            roofGeometry.faces.push(face);
        }
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
FeatureToolBox.prototype.cutLine = function (coords, slope, rest, bbox) {
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
FeatureToolBox.prototype.computeLineBorderPoints = function (pt1, pt2, isFirstPt, offsetValue) {
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
 * @param features: the data received as JSON inside a tab
 * @param box: 		the tile bounding box (rad)
 * @param layer: 	the current layer with specific parameters
 */
FeatureToolBox.prototype.GeoJSON2Line = function (features, box, layer, pointOrder, geometry) {
    var bbox = new BoundingBox(box.west() * 180.0 / Math.PI,
								box.east() * 180.0 / Math.PI,
								box.south() * 180.0 / Math.PI,
								box.north() * 180.0 / Math.PI,
								box.bottom(), box.top());
    var minLong = bbox.west(),
        maxLong = bbox.east(),
        minLat = bbox.south(),
        maxLat = bbox.north();

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
                cX = c[pointOrder.long],
                cY = c[pointOrder.lat],
                c1 = coords[j + 1];
            if (c_1 != undefined) { var c_1X = c_1[pointOrder.long],
                c_1Y = c_1[pointOrder.lat]; }
            if (c1 != undefined) { var c1X = c1[pointOrder.long],
                c1Y = c1[pointOrder.lat]; }

            if (cX < minLong || cX > maxLong || cY < minLat || cY > maxLat) {
                if (inTile) {
                    const coeffSlope = (cY - c_1Y) / (cX - c_1X);
                    const rest = cY - coeffSlope * cX;

                    this.cutLine(c, coeffSlope, rest, bbox);
                    j++;
                } else if (c1 != undefined && c1X > minLong && c1X < maxLong && c1Y > minLat && c1Y < maxLat) {
                    const coeffSlope = (c1Y - cY) / (c1X - cX);
                    const rest = c1Y - coeffSlope * c1X;

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
            var resp = this.computeLineBorderPoints(new THREE.Vector3(coords[0][pointOrder.long], coords[0][pointOrder.lat], 180),
                                                    new THREE.Vector3(coords[1][pointOrder.long], coords[1][pointOrder.lat], 180),
                                                    true, layer.params.length || 10);

            for (j = 0; j < coords.length - 1; j++) {
                var currentGeometry = new THREE.Geometry();
                currentGeometry.vertices.push(resp.left, resp.right);

                resp = this.computeLineBorderPoints(new THREE.Vector3(coords[j][pointOrder.long], coords[j][pointOrder.lat], 180),
                                                    new THREE.Vector3(coords[j + 1][pointOrder.long], coords[j + 1][pointOrder.lat], 180),
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
    return geometry;
};

/**
 * Create the entire geometry of the object passed in. Is use to create feature geometry
 * like points or boxes.
 * @param features: the data received as JSON inside a tab
 * @param bbox:  	the tile bounding box (rad)
 * @param type:  	the type of mesh for this layer
 * @param layer: 	the current layer with specific parameters
 * @param node: 	the current node
 */
FeatureToolBox.prototype.GeoJSON2Point = function (features, bbox, layer, pointOrder, geometry) {
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var coords = feature.geometry.coordinates;

        var geoCoord = new GeoCoordinate(coords[pointOrder.long], coords[pointOrder.lat], ((bbox.bottom() + bbox.top()) / 2) + 3, UNIT.DEGREE);
        var normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
        var centerPoint = this.ellipsoid.cartographicToCartesian(geoCoord);

        var currentGeometry;
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
    return geometry;
};

/**
 * Manage to put the colors inside the color manager for a feature type 'Point'.
 * @param properties: properties of the feature
 * @param color: 	  manager of the color of a face
 * @params layer: 	  the current layer with specific parameters
 */
FeatureToolBox.prototype.manageColor = function (properties, color, layer) {
    var colorParams = layer.params.color || undefined;

    if (colorParams !== undefined) {
        for (var i = 0; i < colorParams.testTab.length; i++) {
            if (properties[colorParams.property] === colorParams.testTab[i]) {
                color.setHex(colorParams.colorTab[i]);
                return;
            }
        }
    }
    color.setHex(new THREE.Color(0xFFFFFF));
};

// //addFeature
FeatureToolBox.prototype.createGeometryArray = function (json) {
    var geometry_array = [];

    if (json.type == 'Feature') {
        geometry_array.push(json.geometry);
    } else if (json.type == 'FeatureCollection') {
        for (var feature_num = 0; feature_num < json.features.length; feature_num++) {
            geometry_array.push(json.features[feature_num].geometry);
        }
    } else if (json.type == 'GeometryCollection') {
        for (var geom_num = 0; geom_num < json.geometries.length; geom_num++) {
            geometry_array.push(json.geometries[geom_num]);
        }
    } else {
        throw new Error('The geoJSON is not valid.');
    }
    // alert(geometry_array.length);
    return geometry_array;
};

FeatureToolBox.prototype.convertLonLatToWGS84 = function (coordinates_array) {
    var lon = coordinates_array[0];
    var lat = coordinates_array[1];
    var geoCoord = new GeoCoordinate(lon, lat, 180, UNIT.DEGREE);
    return this.ellipsoid.cartographicToCartesian(geoCoord);
};

FeatureToolBox.prototype.getMidpoint = function (point1, point2) {
    var midpoint_lon = (point1[0] + point2[0]) / 2;
    var midpoint_lat = (point1[1] + point2[1]) / 2;
    var midpoint = [midpoint_lon, midpoint_lat];

    return midpoint;
};

FeatureToolBox.prototype.needsInterpolation = function (point2, point1) {
    // If the distance between two latitude and longitude values is
    // greater than five degrees, return true.
    var lon1 = point1[0];
    var lat1 = point1[1];
    var lon2 = point2[0];
    var lat2 = point2[1];
    var lon_distance = Math.abs(lon1 - lon2);
    var lat_distance = Math.abs(lat1 - lat2);

    if (lon_distance > 5 || lat_distance > 5) {
        return true;
    } else {
        return false;
    }
};


FeatureToolBox.prototype.interpolatePoints = function (interpolation_array) {
    // This function is recursive. It will continue to add midpoints to the
    // interpolation array until needsInterpolation() returns false.
    var temp_array = [];
    var point1,
        point2;

    for (var point_num = 0; point_num < interpolation_array.length - 1; point_num++) {
        point1 = interpolation_array[point_num];
        point2 = interpolation_array[point_num + 1];

        if (this.needsInterpolation(point2, point1)) {
            temp_array.push(point1);
            temp_array.push(this.getMidpoint(point1, point2));
        } else {
            temp_array.push(point1);
        }
    }

    temp_array.push(interpolation_array[interpolation_array.length - 1]);

    if (temp_array.length > interpolation_array.length) {
        temp_array = this.interpolatePoints(temp_array);
    } else {
        return temp_array;
    }
    return temp_array;
};

FeatureToolBox.prototype.createCoordinateArray = function (feature) {
    // Loop through the coordinates and figure out if the points need interpolation.
    var temp_array = [];
    var interpolation_array = [];

    for (var point_num = 0; point_num < feature.length; point_num++) {
        var point1 = feature[point_num];
        var point2 = feature[point_num - 1];

        if (point_num > 0) {
            if (this.needsInterpolation(point2, point1)) {
                interpolation_array = [point2, point1];
                interpolation_array = this.interpolatePoints(interpolation_array);

                for (var inter_point_num = 0; inter_point_num < interpolation_array.length; inter_point_num++) {
                    temp_array.push(interpolation_array[inter_point_num]);
                }
            } else {
                temp_array.push(point1);
            }
        } else {
            temp_array.push(point1);
        }
    }
    return temp_array;
};

FeatureToolBox.prototype.processingGeoJSON = function (json) {
    var jsonFeatures = this.createGeometryArray(json);
    var coordinate_array = [];
    var geometry = new THREE.Geometry();
    var bpoint = true;
    for (var nFeature = 0; nFeature < jsonFeatures.length; nFeature++) {
        if (jsonFeatures[nFeature].type == 'Point') {
            const vertex = this.convertLonLatToWGS84(jsonFeatures[nFeature].coordinates);
            geometry.vertices.push(vertex);
        }
        else if (jsonFeatures[nFeature].type == 'MultiPoint') {
            for (let point_num = 0; point_num < jsonFeatures[nFeature].coordinates.length; point_num++) {
                const vertex = this.convertLonLatToWGS84(jsonFeatures[nFeature].coordinates[point_num]);
                geometry.vertices.push(vertex);
            }
        }
        else if (jsonFeatures[nFeature].type == 'LineString') {
            coordinate_array = this.createCoordinateArray(jsonFeatures[nFeature].coordinates);

            for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
                const vertex = this.convertLonLatToWGS84(coordinate_array[point_num]);
                geometry.vertices.push(vertex);
            }
            bpoint = false;
        }

        else if (jsonFeatures[nFeature].type == 'Polygon') {
            for (let segment_num = 0; segment_num < jsonFeatures[nFeature].coordinates.length; segment_num++) {
                coordinate_array = this.createCoordinateArray(jsonFeatures[nFeature].coordinates[segment_num]);

                for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
                    const vertex = this.convertLonLatToWGS84(coordinate_array[point_num]);
                    geometry.vertices.push(vertex);
                }
            }
            bpoint = false;
        }
        else if (jsonFeatures[nFeature].type == 'MultiLineString') {
            for (let segment_num = 0; segment_num < jsonFeatures[nFeature].coordinates.length; segment_num++) {
                coordinate_array = this.createCoordinateArray(jsonFeatures[nFeature].coordinates[segment_num]);

                for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
                    const vertex = this.convertLonLatToWGS84(coordinate_array[point_num]);
                    geometry.vertices.push(vertex);
                }
            }
            bpoint = false;
        }
        else if (jsonFeatures[nFeature].type == 'MultiPolygon') {
            for (let polygon_num = 0; polygon_num < jsonFeatures[nFeature].coordinates.length; polygon_num++) {
                for (let segment_num = 0; segment_num < jsonFeatures[nFeature].coordinates[polygon_num].length; segment_num++) {
                    coordinate_array = this.createCoordinateArray(jsonFeatures[nFeature].coordinates[polygon_num][segment_num]);

                    for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
                        const vertex = this.convertLonLatToWGS84(coordinate_array[point_num]);
                        geometry.vertices.push(vertex);
                    }
                }
            }
            bpoint = false;
        } else {
            throw new Error('The geoJSON is not valid.');
        }
    }

    if (!bpoint) {
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        return new THREE.Line(geometry, material);
    } else {
        const material = new THREE.PointsMaterial({ color: 0xff0000, size: 100 });
        return new THREE.Points(geometry, material);
    }
};

export default FeatureToolBox;
