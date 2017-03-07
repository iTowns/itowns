/**
 * Generated On: 2016-09-28
 * Class: FeatureToolBox
 * Description:
 */

import * as THREE from 'three';
import Earcut from 'earcut';
import { C, ellipsoidSizes } from '../../Core/Geographic/Coordinates';
import Ellipsoid from '../../Core/Math/Ellipsoid';
import BasicMaterial from '../../Renderer/BasicMaterial';
import Lines from '../../Renderer/Lines';
import NodeMesh from '../../Renderer/NodeMesh';

function prepareToRtc(object3D, center) {
    object3D.matrixWorld.elements = new Float64Array(16);
    object3D.matrix.elements = new Float64Array(16);
    object3D.position.copy(center);
    object3D.updateMatrixWorld();
    object3D.matrixAutoUpdate = false;
    object3D.matrixWorldNeedsUpdate = false;
}

function FeatureToolBox() {
    this.ellipsoid = new Ellipsoid(ellipsoidSizes());
}

const geoCoord = new C.EPSG_4326(0, 0, 0);

geoCoord.set = function set(longitude, latitude, altitude) {
    geoCoord._values[0] = longitude;
    geoCoord._values[1] = latitude;
    geoCoord._values[2] = altitude;
};

FeatureToolBox.prototype.geoArrayTo3D = function geoArrayTo3D(point, altitude, pointOrder) {
    return this.geoCoordTo3D(parseFloat(point[pointOrder.long]), parseFloat(point[pointOrder.lat]), altitude);
};

FeatureToolBox.prototype.geoCoordTo3D = function geoCoordTo3D(longitude, latitude, altitude) {
    geoCoord.set(longitude, latitude, altitude);
    return geoCoord.as('EPSG:4978').xyz();
};

FeatureToolBox.prototype.GeoJSON2Polygon = function GeoJSON2Polygon(features, pointOrder) {
    const polyGroup = new THREE.Object3D();
    for (let r = 0; r < features.length; r++) {
        const positions = [];
        const polygon = features[r].geometry.coordinates[0][0];
        const altitude = features[r].properties.z_min;
        if (polygon.length > 2 && altitude != 9999) {
            for (let j = 0; j < polygon.length; ++j) {
                const spt = this.geoArrayTo3D(polygon[j], altitude, pointOrder);
                positions.push(spt.x, spt.y, spt.z);
            }
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 });
            geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
            geometry.computeBoundingSphere();
            const poly = new THREE.Line(geometry, material);
            poly.frustumCulled = false;
            polyGroup.add(poly);
        }
    }
    return polyGroup;
};

FeatureToolBox.prototype.GeoJSON2Box = function GeoJSON2Box(features, pointOrder) {
    const bboxGroup = new THREE.Object3D();
    const wallGeometry = new THREE.Geometry(); // for the walls
    const roofGeometry = new THREE.Geometry(); // for the roof
    const center = this.geoArrayTo3D(features[0].geometry.coordinates[0][0][0], 0, pointOrder);

    for (let r = 0; r < features.length; r++) {
        const height = features[r].properties.hauteur;
        const altitude = features[r].properties.z_min;
        const arrPoint2D = [];
        const polygon = features[r].geometry.coordinates[0][0];
        const type = features[r].id.substr(0, features[r].id.indexOf('.'));

        var white;
        var black;
        if (type === 'bati_indifferencie') {
            white = new THREE.Color(0xffffff);
            black = new THREE.Color(0x000000);
        } else if (type === 'bati_remarquable') {
            white = new THREE.Color(0x5555ff);
            black = new THREE.Color(0x000055);
        } else if (type === 'bati_industriel') {
            white = new THREE.Color(0xff5555);
            black = new THREE.Color(0x550000);
        }

        if (polygon.length > 2) {
            // VERTICES
            for (let j = 0; j < polygon.length - 1; ++j) {
                const pgeo2 = this.geoArrayTo3D(polygon[j], altitude, pointOrder).sub(center);
                const pgeo1 = this.geoArrayTo3D(polygon[j], altitude - height, pointOrder).sub(center);

                arrPoint2D.push(parseFloat(polygon[j][pointOrder.long]), parseFloat(polygon[j][pointOrder.lat]));
                wallGeometry.vertices.push(pgeo1, pgeo2);
            }
            // FACES
            // indice of the first point of the polygon 3D
            for (let k = wallGeometry.vertices.length - ((polygon.length - 1) * 2); k < wallGeometry.vertices.length; k += 2) {
                let l = k; // % (pts2DTab.length);
                if (l > wallGeometry.vertices.length - 4) {
                    l = wallGeometry.vertices.length - ((polygon.length - 1) * 2);
                }

                const faceA = new THREE.Face3(l + 3, l + 1, l);
                const faceB = new THREE.Face3(l + 2, l + 3, l);

                faceA.vertexColors = [white, white, black];
                faceB.vertexColors = [black, white, black];

                wallGeometry.faces.push(faceA);
                wallGeometry.faces.push(faceB);
            }

            const ll = wallGeometry.vertices.length - ((polygon.length - 1) * 2);

            const faceC = new THREE.Face3(ll, ll + 1, wallGeometry.vertices.length - 1);
            const faceD = new THREE.Face3(ll, wallGeometry.vertices.length - 1, wallGeometry.vertices.length - 2);

            faceC.vertexColors = [black, white, white];
            faceD.vertexColors = [black, white, black];

            wallGeometry.faces.push(faceC);
            wallGeometry.faces.push(faceD);
        }

        wallGeometry.computeFaceNormals(); // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH

        //* *************** ROOF ****************************
        // TODO: Use wall building to build roof, and remove cartographicToCartesian using
        const triangles = Earcut(arrPoint2D);
        for (let i = 0; i < triangles.length; i += 3) {
            roofGeometry.vertices.push(this.geoCoordTo3D(arrPoint2D[triangles[i] * 2], arrPoint2D[triangles[i] * 2 + 1], altitude).sub(center));
            roofGeometry.vertices.push(this.geoCoordTo3D(arrPoint2D[triangles[i + 1] * 2], arrPoint2D[triangles[i + 1] * 2 + 1], altitude).sub(center));
            roofGeometry.vertices.push(this.geoCoordTo3D(arrPoint2D[triangles[i + 2] * 2], arrPoint2D[triangles[i + 2] * 2 + 1], altitude).sub(center));

            const face = new THREE.Face3(
                roofGeometry.vertices.length - 3,
                roofGeometry.vertices.length - 2,
                roofGeometry.vertices.length - 1);

            roofGeometry.faces.push(face);
        }
    }

    roofGeometry.computeFaceNormals();

    const wallMat = new BasicMaterial(new THREE.Color('#C6BCB0'));
    const roofMat = new BasicMaterial(new THREE.Color('#839498'));

    wallMat.uniforms.lightingEnabled.value = true;
    roofMat.uniforms.lightingEnabled.value = false;

    const wall = new THREE.Mesh(wallGeometry, wallMat);
    wall.frustumCulled = false;
    const roof = new THREE.Mesh(roofGeometry, roofMat);
    roof.frustumCulled = false;

    bboxGroup.add(wall);
    bboxGroup.add(roof);

    prepareToRtc(bboxGroup, center);


    return bboxGroup;
};

/**
 * Process the data received from a WFS request with a tile of feature type 'Line'.
 * Can be used whe the type of the feature tile is a Grid and not a quadTree
 * @param features: the data received as JSON inside a tab
 * @param box:      the tile bounding box (rad)
 * @param layer:    the current layer with specific parameters
 */
FeatureToolBox.prototype.GeoJSON2Line = function GeoJSON2Line(features, box, layer, pointOrder) {
    const lines = new THREE.Object3D();
    const center = new THREE.Vector3();
    const altitude = layer.params.altitude;

    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const coords = feature.geometry.coordinates;

        if (coords.length) {
            if (i === 0) {
                center.copy(this.geoArrayTo3D(coords[0], altitude, pointOrder));
            }

            const colorLine = new THREE.Color();

            this.manageColor(feature.properties, colorLine, layer);

            const line = new Lines({
                linewidth: 20.0,
                useTexture: false,
                opacity: 1.0,
                sizeAttenuation: true,
                color: colorLine,
            });

            for (let k = 0; k < coords.length; k++) {
                const pt = this.geoArrayTo3D(coords[k], altitude, pointOrder).sub(center);
                line.addPoint(pt);
            }

            line.process();

            lines.add(line);
        }
    }

    prepareToRtc(lines, center);

    return lines;
};

/**
 * Create the entire geometry of the object passed in. Is use to create feature geometry
 * like points or boxes.
 * @param features: the data received as JSON inside a tab
 * @param bbox:     the tile bounding box (rad)
 * @param type:     the type of mesh for this layer
 * @param layer:    the current layer with specific parameters
 * @param node:     the current node
 */
FeatureToolBox.prototype.GeoJSON2Point = function GeoJSON2Point(features, bbox, layer, pointOrder) {
    const points = new THREE.Object3D();
    const center = new THREE.Vector3();
    points.geometry = new THREE.Geometry();
    points.material = new BasicMaterial();
    points.material.uniforms.lightingEnabled.value = false;

    for (let i = 0; i < features.length; i++) {
        const point = new NodeMesh();
        const feature = features[i];
        const coords = feature.geometry.coordinates;
        const geoCoord = new C.EPSG_4326(coords[pointOrder.long], coords[pointOrder.lat], ((bbox.bottom() + bbox.top()) / 2) + 3);
        const normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
        const centerPoint = this.ellipsoid.cartographicToCartesian(geoCoord);

        if (i === 0) {
            center.copy(centerPoint);
        }

        centerPoint.sub(center);

        const params = layer.params;
        if (layer.type == 'box') {
            point.geometry = new THREE.BoxGeometry(params.boxWidth || 40, params.boxWidth || 40, params.boxHeight || 80);
        } else if (layer.type == 'point') {
            point.geometry = new THREE.CircleGeometry(params.radius || 10, params.nbSegment || 3, params.thetaStart || 0, params.thetaLength || 2 * Math.PI);
        } else {
            continue;
        }

        // TODO: replace by point.lookAt(normalGlobe);
        point.geometry.lookAt(normalGlobe);
        point.position.copy(centerPoint);

        const colorPoint = new THREE.Color();
        this.manageColor(feature.properties, colorPoint, layer);

        point.material = new BasicMaterial(colorPoint);

        points.add(point);
    }

    prepareToRtc(points, center);

    return points;
};

/**
 * Manage to put the colors inside the color manager for a feature type 'Point'.
 * @param properties: properties of the feature
 * @param color:      manager of the color of a face
 * @params layer:     the current layer with specific parameters
 */
FeatureToolBox.prototype.manageColor = function manageColor(properties, color, layer) {
    const colorParams = layer.params.color || undefined;

    if (colorParams !== undefined) {
        for (let i = 0; i < colorParams.testTab.length; i++) {
            if (properties[colorParams.property] === colorParams.testTab[i]) {
                color.setHex(colorParams.colorTab[i]);
                return;
            }
        }
    }
    color.setHex(new THREE.Color(0xFFFFFF));
};

FeatureToolBox.prototype.createGeometryArray = function createGeometryArray(json) {
    const geometry_array = [];

    if (json.type == 'Feature') {
        geometry_array.push(json.geometry);
    } else if (json.type == 'FeatureCollection') {
        for (let feature_num = 0; feature_num < json.features.length; feature_num++) {
            geometry_array.push(json.features[feature_num].geometry);
        }
    } else if (json.type == 'GeometryCollection') {
        for (let geom_num = 0; geom_num < json.geometries.length; geom_num++) {
            geometry_array.push(json.geometries[geom_num]);
        }
    } else {
        throw new Error('The geoJSON is not valid.');
    }
    // alert(geometry_array.length);
    return geometry_array;
};

FeatureToolBox.prototype.needsInterpolation = function needsInterpolation(point2, point1) {
    // If the distance between two latitude and longitude values is
    // greater than five degrees, return true.
    const lon1 = point1[0];
    const lat1 = point1[1];
    const lon2 = point2[0];
    const lat2 = point2[1];
    const lon_distance = Math.abs(lon1 - lon2);
    const lat_distance = Math.abs(lat1 - lat2);

    return (lon_distance > 5 || lat_distance > 5);
};

FeatureToolBox.prototype.interpolatePoints = function interpolatePoints(interpolation_array) {
    // This function is recursive. It will continue to add midpoints to the
    // interpolation array until needsInterpolation() returns false.
    const temp_array = [];

    for (let point_num = 0; point_num < interpolation_array.length - 1; point_num++) {
        const point1 = interpolation_array[point_num];
        const point2 = interpolation_array[point_num + 1];

        if (this.needsInterpolation(point2, point1)) {
            temp_array.push(point1);
            const midpoint_lon = (point1[0] + point2[0]) / 2;
            const midpoint_lat = (point1[1] + point2[1]) / 2;
            const midpoint = [midpoint_lon, midpoint_lat];
            temp_array.push(midpoint);
        } else {
            temp_array.push(point1);
        }
    }

    temp_array.push(interpolation_array[interpolation_array.length - 1]);

    if (temp_array.length > interpolation_array.length) {
        return this.interpolatePoints(temp_array);
    } else {
        return temp_array;
    }
};

FeatureToolBox.prototype.createCoordinateArray = function createCoordinateArray(feature) {
    // Loop through the coordinates and figure out if the points need interpolation.
    const temp_array = [];

    for (let point_num = 0; point_num < feature.length; point_num++) {
        const point1 = feature[point_num];
        const point2 = feature[point_num - 1];

        if (point_num > 0) {
            if (this.needsInterpolation(point2, point1)) {
                let interpolation_array = [point2, point1];
                interpolation_array = this.interpolatePoints(interpolation_array);

                for (let inter_point_num = 0; inter_point_num < interpolation_array.length; inter_point_num++) {
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

FeatureToolBox.prototype.processingGeoJSON = function processingGeoJSON(json) {
    // TODO: Why this function?
    // There are GeoJSON2Line and GeoJSON2Point

    const jsonFeatures = this.createGeometryArray(json);
    const geometry = new THREE.Geometry();
    const pointOrder = { long: 0, lat: 1 };
    var bpoint = false;
    var coordinate_array = [];

    const jsonFeaturesToVertex = function jsonFeaturesToVertex(jsonFeatures, alti) {
        coordinate_array = this.createCoordinateArray(jsonFeatures.coordinates);

        for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
            geometry.vertices.push(this.geoArrayTo3D(coordinate_array[point_num], alti, pointOrder));
        }
    }.bind(this);

    for (let nFeature = 0; nFeature < jsonFeatures.length; nFeature++) {
        const altitude = json.features[nFeature].altitude;
        if (jsonFeatures[nFeature].type == 'Point') {
            const vertex = this.geoArrayTo3D(jsonFeatures[nFeature].coordinates, altitude, pointOrder);
            geometry.vertices.push(vertex);
            bpoint = true;
        } else if (jsonFeatures[nFeature].type == 'MultiPoint') {
            for (let point_num = 0; point_num < jsonFeatures[nFeature].coordinates.length; point_num++) {
                coordinate_array = jsonFeatures[nFeature].coordinates[point_num];
                const vertex = this.geoArrayTo3D(coordinate_array, altitude, pointOrder);
                geometry.vertices.push(vertex);
            }
            bpoint = true;
        } else if (jsonFeatures[nFeature].type == 'LineString') {
            jsonFeaturesToVertex(jsonFeatures[nFeature], altitude);
        } else if (jsonFeatures[nFeature].type == 'Polygon') {
            for (let segment_num = 0; segment_num < jsonFeatures[nFeature].coordinates.length; segment_num++) {
                jsonFeaturesToVertex(jsonFeatures[nFeature]);
            }
        } else if (jsonFeatures[nFeature].type == 'MultiLineString') {
            for (let segment_num = 0; segment_num < jsonFeatures[nFeature].coordinates.length; segment_num++) {
                jsonFeaturesToVertex(jsonFeatures[nFeature], altitude);
            }
        } else if (jsonFeatures[nFeature].type == 'MultiPolygon') {
            for (let polygon_num = 0; polygon_num < jsonFeatures[nFeature].coordinates.length; polygon_num++) {
                for (let segment_num = 0; segment_num < jsonFeatures[nFeature].coordinates[polygon_num].length; segment_num++) {
                    jsonFeaturesToVertex(jsonFeatures[nFeature], altitude);
                }
            }
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
