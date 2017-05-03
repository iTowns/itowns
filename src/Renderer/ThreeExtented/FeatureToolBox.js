/**
 * Generated On: 2016-09-28
 * Class: FeatureToolBox
 * Description:
 */

import * as THREE from 'three';
import Earcut from 'earcut';
import { UNIT, C, ellipsoidSizes } from '../../Core/Geographic/Coordinates';
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
    pointOrder = pointOrder || { long: 0, lat: 1 };
    const bboxGroup = new THREE.Object3D();
    const wallGeometry = new THREE.Geometry(); // for the walls
    const roofGeometry = new THREE.Geometry(); // for the roof

    // FIXME : see with geojson standard
    // to get coordinates
    const typeCoords = !isNaN(features[0].geometry.coordinates[0][0][0][0]);
    const cc = typeCoords ? features[0].geometry.coordinates[0][0][0] : features[0].geometry.coordinates[0][0];
    const center = this.geoArrayTo3D(cc, 0, pointOrder);

    for (const feature of features) {
        const height = feature.height || feature.properties.hauteur;
        let altitude = 0;
        if (feature.properties) {
            altitude = feature.properties.z_min - height;
        }

        const arrPoint2D = [];
        const polygon = typeCoords ? feature.geometry.coordinates[0][0] : feature.geometry.coordinates[0];

        let white;
        let black;

        if (!isNaN(feature.id)) {
            white = new THREE.Color(0xffffff);
            black = new THREE.Color(0x000000);
        } else {
            const type = feature.id.substr(0, feature.id.indexOf('.'));
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
        }

        if (polygon.length > 2) {
            // VERTICES
            for (let j = 0; j < polygon.length - 1; ++j) {
                const pgeo2 = this.geoArrayTo3D(polygon[j], altitude + height, pointOrder).sub(center);
                const pgeo1 = this.geoArrayTo3D(polygon[j], altitude, pointOrder).sub(center);

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
            roofGeometry.vertices.push(this.geoCoordTo3D(arrPoint2D[triangles[i] * 2], arrPoint2D[triangles[i] * 2 + 1], altitude + height).sub(center));
            roofGeometry.vertices.push(this.geoCoordTo3D(arrPoint2D[triangles[i + 1] * 2], arrPoint2D[triangles[i + 1] * 2 + 1], altitude + height).sub(center));
            roofGeometry.vertices.push(this.geoCoordTo3D(arrPoint2D[triangles[i + 2] * 2], arrPoint2D[triangles[i + 2] * 2 + 1], altitude + height).sub(center));

            const face = new THREE.Face3(
                roofGeometry.vertices.length - 3,
                roofGeometry.vertices.length - 2,
                roofGeometry.vertices.length - 1);

            face.vertexColors = [white, white, white];

            roofGeometry.faces.push(face);
        }
    }

    roofGeometry.computeFaceNormals();

    const wallMat = new BasicMaterial(
        new THREE.Color(features.style.color || '#C6BCB0'),
        features.style.opacity || 1.0);

    const roofMat = new BasicMaterial(new THREE.Color(features.style.colorRoof || '#839498'),
        features.style.opacity || 1.0);

    wallMat.uniforms.lightingEnabled.value = true;
    roofMat.uniforms.lightingEnabled.value = false;

    wallMat.uniforms.enabledCutColor.value = false;
    roofMat.uniforms.enabledCutColor.value = false;

    wallMat.transparent = true;
    roofMat.transparent = true;

    const wall = new THREE.Mesh(wallGeometry, wallMat);
    wall.frustumCulled = false;
    const roof = new THREE.Mesh(roofGeometry, roofMat);
    roof.frustumCulled = false;

    bboxGroup.add(wall);
    wall.add(roof);

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

FeatureToolBox.prototype.intersectsegment = function intersectsegment(a, b, i, p) {
    var d = new THREE.Vector2();
    var e = new THREE.Vector2();
    d.x = b.x - a.x;
    d.y = b.y - a.y;
    e.x = p.x - i.x;
    e.y = p.y - i.y;
    var denom = d.x * e.y - d.y * e.x;
    if (denom == 0.0)
       { return -1; }   // erreur, cas limite
    var t = -(a.x * e.y - i.x * e.y - e.x * a.y + e.x * i.y) / denom;
    if (t < 0.0 || t >= 1.0)
      { return 0; }
    var u = -(-d.x * a.y + d.x * i.y + d.y * a.x - d.y * i.x) / denom;
    if (u < 0.0 || u >= 1.0)
      { return 0; }
    return 1;
};

/*
 * Function that tests if a point p is inside a polygon using the classic
 * Ray Casting algorithm
 * @param {type} posGeo
 * @returns {undefined}
 */
FeatureToolBox.prototype.inPolygon = function inPolygon(p, arrPoints) {
    var k = new THREE.Vector2(6.0, 75.0); // This point should be out of the polygon
    var nbintersections = 0;
    for (var i = 0; i < arrPoints.length - 1; i++) {
        var a = arrPoints[i];
        var b = arrPoints[i + 1];// .xy;
        var iseg = this.intersectsegment(a, b, k, p);
        nbintersections += iseg;
    }
    return ((nbintersections % 2) === 1);
};

/**
 *
 * display feature attribute information at position p (lonlat)
 */
FeatureToolBox.prototype.showFeatureAttributesAtPos = function showFeatureAttributesAtPos(p, polygons) {
    var intersect = false;
    var properties;
    var i = 0;
    polygons = polygons || this.arrPolygons;
    while (!intersect && i < polygons.length) {
        intersect = this.inPolygon(p, polygons[i].polygon);
        i++;
    }

    i--;
    if (intersect && polygons[i].properties.description !== undefined) {
        properties = polygons[i].properties;
    }

    if (!intersect) return undefined;

    return properties;
};


FeatureToolBox.prototype.drawLine = function drawLine(coordOrigin, tileWH, p1, p2, thickness, ctx, prop) {
    var tilePx = 256;
    ctx.strokeStyle = prop.stroke; // "rgba(255, 0, 255, 0.5)";//"rgba(1,1,0,1)";
    ctx.lineWidth = prop['stroke-width'];
    ctx.globalAlpha = prop['stroke-opacity'];
    ctx.beginPath();
    var a = p1.sub(coordOrigin);
    var b = p2.sub(coordOrigin);
    a.divideScalar(tileWH.x).multiplyScalar(tilePx);
    b.divideScalar(tileWH.x).multiplyScalar(tilePx);
   //      console.log("aa",coordOrigin,tileWH,p1,p2,a,b);
      //       if( (a.x>=0 && a.x<= tilePx && a.y >=0 && a.y <=tilePx)
      //          && (b.x>=0 && b.x<= tilePx && b.y >=0 && b.y <=tilePx)){
    ctx.moveTo(a.x, tilePx - a.y);
    ctx.lineTo(b.x, tilePx - b.y);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
      //      }
   // }
};

/*
 * Draw 2D polygon in tile (rasterized)
 * @param {type} polygon
 * @param {type} coordOrigin
 * @param {type} tileWH
 * @param {type} ctx
 * @param {type} prop
 * @returns {undefined}
 */
FeatureToolBox.prototype.drawPolygon = function drawPolygon(polygon, coordOrigin, tileWH, ctx, prop) {
    var tilePx = 256;
    ctx.strokeStyle = prop.stroke;
    ctx.lineWidth = prop['stroke-width'];
    ctx.fillStyle = prop.fill; // "rgba(255, 0, 255, 0.5)";//"rgba(1,1,0,1)";
    ctx.globalAlpha = prop['fill-opacity'];
    // ctx["stroke-opacity"] = 0.8;
    // console.log(ctx.strokeStyle);
    ctx.beginPath();

    for (var i = 0; i < polygon.length - 1; ++i) {
        var p1 = polygon[i];
        var p2 = polygon[i + 1];
        var a = p1.clone().sub(coordOrigin);
        var b = p2.clone().sub(coordOrigin);

        a.divideScalar(tileWH.x).multiplyScalar(tilePx);
        b.divideScalar(tileWH.x).multiplyScalar(tilePx);

        if (i === 0) {
            ctx.moveTo(a.x, tilePx - a.y);
            ctx.lineTo(b.x, tilePx - b.y);
        } else {
            ctx.lineTo(b.x, tilePx - b.y);
        }
    }
    ctx.closePath();
    ctx.globalAlpha = prop['fill-opacity'];
    ctx.fill();
    ctx.globalAlpha = prop['stroke-opacity'];
    ctx.stroke();
    ctx.globalAlpha = 1.0;
};


// parameters in deg, vec2
FeatureToolBox.prototype.createRasterImage = function createRasterImage(bbox, features) {
    const origin = new THREE.Vector2(bbox.west(UNIT.DEGREE), bbox.south(UNIT.DEGREE));
    const dimension = bbox.dimensions(UNIT.RADIAN);
    const size = new THREE.Vector2(dimension.x, dimension.y).divideScalar(Math.PI / 180);

    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var ctx = c.getContext('2d');
    // Lines
    for (let j = 0; j < features.lines.length; ++j) {
        var line = features.lines[j].line;
        var properties = features.lines[j].properties;
        for (let i = 0; i < line.length - 1; ++i) {
            this.drawLine(origin, size, line[i].clone(), line[i + 1].clone(), 4, ctx, properties);
        }
    }
    // Polygon
    for (let i = 0; i < features.polygons.length; ++i) {
        this.drawPolygon(features.polygons[i].polygon, origin, size, ctx, features.polygons[i].properties);
    }

    var texture = new THREE.Texture(c);
    texture.flipY = true;  // FALSE by default on THREE.DataTexture but True by default for THREE.Texture!
    texture.needsUpdate = true;
    texture.name = 'featureRaster';
    return texture;
};


 // Extract polygons and lines for raster rendering in GPU
FeatureToolBox.prototype.extractFeatures = function extractFeatures(json) {
    var arrPolygons = [];
    var arrLines = [];

    for (var nFeature = 0; nFeature < json.features.length; nFeature++) {
        var feat = json.features[nFeature];
        if (feat.geometry.type === 'LineString') {
            var arrLine = [];
            for (let point_num = 0; point_num < feat.geometry.coordinates.length; point_num++) {
                const v = feat.geometry.coordinates[point_num];
                arrLine.push(new THREE.Vector2(v[0], v[1]));
            }
            arrLines.push({ line: arrLine, properties: feat.properties });
        }

        if (feat.geometry.type === 'Polygon') {
            var arrPolygon = [];
            for (let point_num = 0; point_num < feat.geometry.coordinates.length; point_num++) {
                for (var p = 0; p < feat.geometry.coordinates[point_num].length; ++p) {
                    const v = feat.geometry.coordinates[point_num][p];
                    arrPolygon.push(new THREE.Vector2(v[0], v[1]));
                }
            }
            arrPolygons.push({ polygon: arrPolygon, properties: feat.properties });
        }
    }
    this.arrPolygons = arrPolygons;
    this.arrLines = arrLines;
    return { lines: arrLines, polygons: arrPolygons };
};


FeatureToolBox.prototype.createFeaturesPoints = function createFeaturesPoints(json) {
    var globalObject = new THREE.Object3D();
    const pointOrder = { long: 0, lat: 1 };

    for (var nFeature = 0; nFeature < json.features.length; nFeature++) {
        var feat = json.features[nFeature];
        if (feat.geometry.type === 'Point') {
            var vertex = this.geoArrayTo3D(feat.geometry.coordinates, feat.geometry.coordinates[2], pointOrder);
            if (feat.properties.name != null) {
                globalObject.add(this.createText(vertex, feat.properties));
            } else {
                globalObject.add(this.createIcon(vertex));
            }
        }
    }
    return globalObject;
};

FeatureToolBox.prototype.processingGeoJSON = function processingGeoJSON(json) {
    // TODO: Why this function?
    // There are GeoJSON2Line and GeoJSON2Point

    const jsonFeatures = this.createGeometryArray(json);
    const geometry = new THREE.Geometry();
    const pointOrder = { long: 0, lat: 1 };
    var bpoint = false;
    var coordinate_array = [];

    const jsonFeaturesToVertex = function jsonFeaturesToVertex(coordinates, alti, geom) {
        coordinate_array = this.createCoordinateArray(coordinates);
        for (const coordinate of coordinate_array) {
            const v = this.geoArrayTo3D(coordinate, alti, pointOrder);
            if (geom) {
                geom.vertices.push(v);
            } else {
                geometry.vertices.push(v);
            }
        }
    }.bind(this);

    let center;
    const poly = new THREE.Object3D();

    for (const feature of jsonFeatures) {
        const altitude = feature.altitude || json.altitude;
        if (feature.type == 'Point') {
            const vertex = this.geoArrayTo3D(feature.coordinates, altitude, pointOrder);
            geometry.vertices.push(vertex);
            bpoint = true;
        } else if (feature.type == 'MultiPoint') {
            for (let point_num = 0; point_num < feature.coordinates.length; point_num++) {
                coordinate_array = feature.coordinates[point_num];
                const vertex = this.geoArrayTo3D(coordinate_array, altitude, pointOrder);
                geometry.vertices.push(vertex);
            }
            bpoint = true;
        } else if (feature.type == 'LineString') {
            jsonFeaturesToVertex(feature.coordinates, altitude);
        } else if (feature.type == 'Polygon') {
            for (const coords of feature.coordinates) {
                const colorLine = new THREE.Color(json.stroke || 0xff0000);
                const line = new Lines({
                    linewidth: json.strokeWidth || 1.0,
                    useTexture: false,
                    opacity: json.strokeOpacity || 1.0,
                    sizeAttenuation: false,
                    color: colorLine,
                });

                for (const coord of coords) {
                    if (!center) {
                        center = this.geoArrayTo3D(coord, altitude, pointOrder);
                    }
                    const pt = this.geoArrayTo3D(coord, altitude, pointOrder);
                    pt.sub(center);
                    line.addPoint(pt);
                }

                line.process();
                poly.add(line);
            }
        } else if (feature.type == 'MultiLineString') {
            for (let segment_num = 0; segment_num < feature.coordinates.length; segment_num++) {
                jsonFeaturesToVertex(feature.coordinates, altitude);
            }
        } else if (feature.type == 'MultiPolygon') {
            const geometry = new THREE.Geometry();
            const bboxGroup = new THREE.Object3D();
            const normal = new THREE.Vector3();
            const center = new THREE.Vector3();
            let cc = true;
            let minALtitude = 100000;
            for (const polygons of feature.coordinates) {
                for (const polygon of polygons) {
                    let vertexs = [];
                    for (const vertex of polygon) {
                        minALtitude = Math.min(minALtitude, vertex[2]);
                        const cartesien = this.geoCoordTo3D(vertex[0], vertex[1], vertex[2]);
                        if (cc) {
                            cc = false;
                            center.copy(cartesien);
                            normal.copy(center).normalize();
                            bboxGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
                            prepareToRtc(bboxGroup, center);
                        }
                        bboxGroup.worldToLocal(cartesien);
                        vertexs = vertexs.concat(cartesien.toArray());
                    }

                    const triangles = Earcut(vertexs, null, 3);
                    for (let i = 0; i < triangles.length; i += 3) {
                        const v1 = new THREE.Vector3(vertexs[triangles[i] * 3], vertexs[triangles[i] * 3 + 1], vertexs[triangles[i] * 3 + 2]);
                        const v2 = new THREE.Vector3(vertexs[triangles[i + 1] * 3], vertexs[triangles[i + 1] * 3 + 1], vertexs[triangles[i + 1] * 3 + 2]);
                        const v3 = new THREE.Vector3(vertexs[triangles[i + 2] * 3], vertexs[triangles[i + 2] * 3 + 1], vertexs[triangles[i + 2] * 3 + 2]);
                        geometry.vertices.push(v1);
                        geometry.vertices.push(v2);
                        geometry.vertices.push(v3);

                        const face = new THREE.Face3(
                            geometry.vertices.length - 3,
                            geometry.vertices.length - 2,
                            geometry.vertices.length - 1);

                        geometry.faces.push(face);
                    }
                }
            }

            geometry.computeFaceNormals();

            const wallMat = new BasicMaterial(
                new THREE.Color(json.stroke),
                1.0);

            wallMat.side = THREE.DoubleSide;
            wallMat.uniforms.lightOn.value = true;
            wallMat.uniforms.enabledCutColor.value = true;
            wallMat.transparent = true;

            const wall = new THREE.Mesh(geometry, wallMat);
            wall.frustumCulled = false;

            bboxGroup.add(wall);

            minALtitude -= (json.translate || 0.0);

            bboxGroup.translateOnAxis(new THREE.Vector3(0, 1, 0), -minALtitude);
            wall.translateOnAxis(new THREE.Vector3(0, 1, 0), -minALtitude);
            bboxGroup.updateMatrixWorld(true);

            return bboxGroup;
        } else {
            throw new Error('The geoJSON is not valid.');
        }
    }

    if (poly.children.length) {
        prepareToRtc(poly, center);
        return poly;
    }

    if (!bpoint) {
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1 });
        const line = new THREE.Line(geometry, material);
        return line;
    } else {
        const material = new THREE.PointsMaterial({ color: 0xff0000, size: 100 });
        return new THREE.Points(geometry, material);
    }
};

/*
 * Create icon at position for point geometry
 * Icon size should be constant. -> need a specific shader
 * @returns {FeatureToolBox.prototype.createIcon.texture|THREE.Texture}
 */
FeatureToolBox.prototype.createIcon = function createIcon(pos) {
    var image = document.createElement('img');
    var texture = new THREE.Texture(image);
    image.onload = function onload() {
        texture.needsUpdate = true;
    };
    image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AsVDRIojx5s5AAABPVJREFUWMOtlmtsk1UYx3+nb7uVdu0ulg2oso2xjXF1kzmMsE3GRQSBRRMxJvhBY0xITKYoKHzx8sEoihIjGoyJBiKoYMQwQwK4DVHwE1nGpbKxdVvoZrbR0W20b9v3+KGdtHTbu1X+ycmbN+fy/5/ncp5HSCkZDxK4NXSbyy3NtLW1UbyowtHe0b6ipDC3qtBpW2IW/izQDCEx7Za7T716saX199y8gt86W5s7rBYzS8sfITPDhkGMS4HQEzDoG8HlcqUrqWkvz7YPbc0ePjOf7nPQdxmp9oPUECY7ZBaCs4KhzFW97f7ZP3oH+vcWF81tc2Rl/D8B3mGtVAkN7LO7v1pOy37o74xMKoAhulADwtEN1gyYt4XbxXXukWmFdRnTxE+KIXkBNdpg6yGl4YUc3E1gihJPBA0IApn5aNVfhLh/zesG+CQZAQvxdZzi10059DSDmclDAAHAnA7rfgjiXL0VODwVAVbC/nrqN1TSfjqRXAKh6FdEv8YYl4xCBewPQG1DH7Y5jwEtdxMleCcYDCFhC66vK+kYgzwIKCmQvxat9BUtXPpqiOKnwXJfhDD2PinAYBf8tdsB1PkDqtC1wOCw6rTTd1wcX1nGgCvi99gbOSvwLXz7kq1w7YIEu53eAlePRKwhYmJCpMLGkz6PqaxipsN2ZUILDPvVGtlz9kEGXJGDRhECchZC7XnGJAeoOQwlz0WsFMugBqDjmE1VA4/ruiDNFKwSNxoNEeUxPscA1R/f0A3AlQchLTty89ig9FzAYQk/qivAnhouFjdd8TMhIGcJTF89azJJIHPXRfaMQgF8HViN/jm6AggOW2WgL3FmetGkszCYXuKL2y+AoBfUWxZ9AYoxjFDio3mqkJq4e79EAaFougK6+oLXySiKPK2xN/jnyqT5Td5LaXECwiDS8+jyal26Ai619TSEndUScZcPe5uh+1ifLnugq0m4T8SnrwbMWkZbj/+croBF84tOiRnVraRNv2MFEV15drsj6G1tmlBAw7ZKRrzxGaQImLlGnVc096SugFnZWddk+rzvKNicGMn97ZhObqwc/vto55iur38Crv0SeQFjMyh7EWrOqobsrIyLk60F87l5uZGj5Q5CI4kpaVTAuQIcJWBIAe916D4LI95404++nmu+0WTR1uelph00GAyTroZ7aHrpNS4eGL8Yxf4rY5RqFZjxEGxuOo/RUh2tkTppeAcfUrqzG3tOPNloTJhiRsoY5DJatJbuDmG07BqLXE9AL7Y5eyh7IxLFU30XAkBhLeQ++T1wJqmOCLCiBU5wYm0V7sb44JoIYcCSA09d8JCWWwVcG29pggWklLFjGEPqW1R8MESKJf5xmqiRDAHL3oG03PcmItdzwSj+IPvh9ynfDWGh7woVKK7F53z2Z03T9usdniBACBE3oviIxXVNFGyIEIyHEJAxGyo/77nuvrEjGFTllAWMAz+KeRvLP/Vgn5mYFf91PkZYsU9inlGXbjW7DAaFeyUAoAVb/k6W7wVhjm84RnvFsu2Qt+lL4HBeXi4mk+meCgD4loJnDlC+I77t8gMF66H83T+BXVMr3fFRP5mRKcOBRlm/Xsp9SPkZUh7Kl3LI7ZFSLpjqeckIQEo5V454OuWRxVLuT5HScy4spdyYzFnJCkBKuU72nvfJtiNSSvlmsufovYR6qAOWAC8ydm7o4l8IO+JWe1h9JQAAAABJRU5ErkJggg==';
    var materialS = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, depthTest: false });
    var sprite = new THREE.Sprite(materialS);
    sprite.scale.set(500, 500, 500);
    sprite.position.copy(pos);

    var material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: false }); // side:THREE.DoubleSide, , linewidth: 5
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(), new THREE.Vector3(-pos.x, -pos.y, -pos.z).divideScalar(1000));
    var line = new THREE.Line(geometry, material);
    sprite.add(line);
    return sprite;
};

FeatureToolBox.prototype.createText = function createText(pos, prop) {
    var sprite = makeTextSprite(prop.name);
    sprite.position.copy(pos);

    var material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: false }); // side:THREE.DoubleSide, , linewidth: 5,
    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(), new THREE.Vector3(-pos.x, -pos.y, -pos.z).divideScalar(1000));
    var line = new THREE.Line(geometry, material);
    sprite.add(line);

    return sprite;
};

function makeTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};
    var fontface = {}.propertyIsEnumerable.call(parameters, 'fontface') ?
            parameters.fontface : 'Arial';

    var fontsize = {}.propertyIsEnumerable.call(parameters, 'fontsize') ?
            parameters.fontsize : 22;

    var borderThickness = {}.propertyIsEnumerable.call(parameters, 'borderThickness') ?
            parameters.borderThickness : 4;

    var borderColor = {}.propertyIsEnumerable.call(parameters, 'borderColor') ?
            parameters.borderColor : { r: 0, g: 0, b: 0, a: 1.0 };

    var backgroundColor = {}.propertyIsEnumerable.call(parameters, 'backgroundColor') ?
            parameters.backgroundColor : { r: 255, g: 255, b: 255, a: 0.8 };

    // var spriteAlignment = THREE.SpriteAlignment.topLeft;

    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    var context = canvas.getContext('2d');
    context.font = `Bold ${fontsize}px ${fontface}`;

    // get size data (height depends only on font size)
    var metrics = context.measureText(message);
    var textWidth = metrics.width;

    // background color
    context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${
                              backgroundColor.b},${backgroundColor.a})`;
    // border color
    context.strokeStyle = `rgba(${borderColor.r},${borderColor.g},${
                              borderColor.b},${borderColor.a})`;
    context.lineWidth = borderThickness;
    roundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
    // 1.4 is extra height factor for text below baseline: g,j,p,q.
    // text color
    context.fillStyle = 'rgba(0, 0, 0, 1.0)';
    context.fillText(message, borderThickness, fontsize + borderThickness);
    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, depthTest: false });// , useScreenCoordinates: false} );
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1000, 1000, 1000);// 100,50,1.0);
    return sprite;
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r)
{
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

export default FeatureToolBox;
