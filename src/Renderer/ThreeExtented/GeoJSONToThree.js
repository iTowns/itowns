/**
* Class: GeoJSONToThree
* Description: Converts GeoJSON features to ThreeJS geometries
*/


import THREE from 'THREE';
import earcut from 'earcut';

function GeoJSONToThree() {

}

GeoJSONToThree.convert = function(geoJson) {
    var geometries = [];
    var propertiesList = [];
    for (var f = 0; f < geoJson.features.length; f++) {
        var bbox = [];
        if (geoJson.features[f].geometry.bbox.length == 6) { // 3D bounding box
            bbox[0] = geoJson.features[f].geometry.bbox[0];
            bbox[1] = geoJson.features[f].geometry.bbox[1];
            bbox[2] = geoJson.features[f].geometry.bbox[3];
            bbox[3] = geoJson.features[f].geometry.bbox[4];
        } else { // 2D bounding box
            bbox[0] = geoJson.features[f].geometry.bbox[0];
            bbox[1] = geoJson.features[f].geometry.bbox[1];
            bbox[2] = geoJson.features[f].geometry.bbox[2];
            bbox[3] = geoJson.features[f].geometry.bbox[3];
        }

        var coords = geoJson.features[f].geometry.coordinates;
        var type = geoJson.features[f].geometry.type;

        var geom = this.geomFromGeoJSON(type, coords);

        var threeGeom = this.geomToThree(geom);

        // add properties
        var properties = JSON.stringify(geoJson.features[f].properties);
        /*properties.bbox = bbox;
        propertiesList.push(properties);*/
        geometries.push(threeGeom);
    }
    var mergedGeom = new THREE.Geometry().fromBufferGeometry(geometries[0]);
    for (var i = 1; i < geometries.length; i++) {
        mergedGeom.merge(new THREE.Geometry().fromBufferGeometry(geometries[i]));
    }

    return {
        geometries: mergedGeom,
        properties: properties
    };
};

GeoJSONToThree.geomToThree = function(geom) {
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.addAttribute('position', new THREE.BufferAttribute(geom.position, 3));
    bufferGeom.addAttribute('normal', new THREE.BufferAttribute(geom.normal, 3));
    return bufferGeom;
};

GeoJSONToThree.geomFromGeoJSON = function(type, coords) {
    if (type == 'PolyhedralSurface') {
        return this.geomFromPolyhedralSurface(coords);
    } else if (type == 'MultiPolygon') {
        return this.geomFromPolyhedralSurface(coords); // TODO : check if different process is necessary for multipolygon
    }
    throw "Unhandled geometry type '" + type + "'";
};

GeoJSONToThree.geomFromPolyhedralSurface = function(coords) {
    var t, v, i, j;
    var U, V, N;
    var nPoints = 0;
    for (t = 0; t < coords.length; t++) {
        // polygon with n points = n - 2 triangles - 1 because of duplicate first point
        nPoints += coords[t][0].length - 2 - 1;
    }
    // Note: the memory allocation doesn't take into account degenerate geometries
    var position = new Float32Array(9 * nPoints);
    var normal = new Float32Array(position.length);
    var centroid = [0, 0, 0];
    var radius = 0;
    var center = new Float32Array(3);

    var posCount = 0;

    // set position and compute 3D centroid
    for (i = 0, t = 0; t < coords.length; t++) {
        var delta = 0;
        var positionPolygon = [];
        var positionPolygon2D = [];

        for (v = 0; v < coords[t][0].length - 1; v++) {
            var duplicate = false;
            // removing duplicate points
            for (j = 0; j < positionPolygon.length; j += 3) {
                if (coords[t][0][v][0] == positionPolygon[j] &&
                    coords[t][0][v][1] == positionPolygon[j + 1] &&
                    coords[t][0][v][2] == positionPolygon[j + 2]) {
                    duplicate = true;
                }
            }
            if (duplicate) {
                delta++;
                continue;
            }
            positionPolygon[3 * (v - delta)] = coords[t][0][v][0];
            positionPolygon[3 * (v - delta) + 1] = coords[t][0][v][1];
            positionPolygon[3 * (v - delta) + 2] = coords[t][0][v][2];
        }
        // removing some of the degenerated polygons (2 points or less)
        if (positionPolygon.length < 9) continue;
        var vect1 = [positionPolygon[3] - positionPolygon[0],
            positionPolygon[4] - positionPolygon[1],
            positionPolygon[5] - positionPolygon[2]
        ];
        var vect2 = [positionPolygon[6] - positionPolygon[0],
            positionPolygon[7] - positionPolygon[1],
            positionPolygon[8] - positionPolygon[2]
        ];
        var vectProd = [vect1[1] * vect2[2] - vect1[2] * vect2[1],
            vect1[2] * vect2[0] - vect1[0] * vect2[2],
            vect1[0] * vect2[1] - vect1[1] * vect2[0]
        ];
        // triangulation of the polygon projected on planes (xy) (zx) or (yz)
        if (Math.abs(vectProd[0]) > Math.abs(vectProd[1]) && Math.abs(vectProd[0]) > Math.abs(vectProd[2])) {
            // (yz) projection
            for (v = 0; 3 * v < positionPolygon.length; v++) {
                positionPolygon2D[2 * v] = positionPolygon[3 * v + 1];
                positionPolygon2D[2 * v + 1] = positionPolygon[3 * v + 2];
            }
        } else if (Math.abs(vectProd[1]) > Math.abs(vectProd[2])) {
            // (zx) projection
            for (v = 0; 3 * v < positionPolygon.length; v++) {
                positionPolygon2D[2 * v] = positionPolygon[3 * v];
                positionPolygon2D[2 * v + 1] = positionPolygon[3 * v + 2];
            }
        } else {
            // (xy) projextion
            for (v = 0; 3 * v < positionPolygon.length; v++) {
                positionPolygon2D[2 * v] = positionPolygon[3 * v];
                positionPolygon2D[2 * v + 1] = positionPolygon[3 * v + 1];
            }
        }
        var triangles = earcut(positionPolygon2D);
        // reordering triangle points for correct normal computation
        for (v = 0; v < triangles.length; v += 3) {
            var v1 = triangles[v];
            var v2 = triangles[v + 1];
            var v3 = triangles[v + 2];
            if (v1 > v2 && v1 > v3) {
                triangles[v + 2] = v1;
                if (v2 > v3) {
                    triangles[v] = v3;
                    triangles[v + 1] = v2;
                } else {
                    triangles[v] = v2;
                    triangles[v + 1] = v3;
                }
            } else if (v1 > v2) {
                triangles[v] = v2;
                triangles[v + 1] = v1;
                triangles[v + 2] = v3;
            } else if (v1 > v3) {
                triangles[v] = v3;
                triangles[v + 1] = v1;
                triangles[v + 2] = v2;
            } else {
                if (v2 > v3) {
                    triangles[v] = v1;
                    triangles[v + 1] = v3;
                    triangles[v + 2] = v2;
                }
            }
        }
        for (v = 0; v < triangles.length; v++, i += 3) {
            position[i] = positionPolygon[3 * triangles[v]];
            position[i + 1] = positionPolygon[3 * triangles[v] + 1];
            position[i + 2] = positionPolygon[3 * triangles[v] + 2];
            centroid[0] += position[i];
            centroid[1] += position[i + 1];
            centroid[2] += position[i + 2];
            posCount++;
        }
    }
    centroid = mult(centroid, 1.0 / posCount);
    for (i = 0; i < 3; i++) center[i] = centroid[i];

    // compute radius of bounding sphere
    for (v = 0; v < posCount * 3; v += 3) {
        radius = Math.max(radius, normsq(minus(
            [position[v], position[v + 1], position[v + 2]], centroid)));
    }
    radius = Math.sqrt(radius);

    // compute normals
    for (t = 0; t < posCount * 3; t += 9) {
        U = minus([position[t + 3], position[t + 4], position[t + 5]], [position[t], position[t + 1], position[t + 2]]);
        V = minus([position[t + 6], position[t + 7], position[t + 8]], [position[t], position[t + 1], position[t + 2]]);
        N = cross(U, V);
        N = mult(N, 1.0 / norm(N));
        for (i = 0; i < 9; i++) {
            normal[t + i] = N[i % 3];
        }
    }
    for (; t < position.length * 3; t += 9) { // fill unused buffer space with valid normals
        N = [1.0, 0.0, 0.0];
        for (i = 0; i < 9; i++) {
            normal[t + i] = N[i % 3];
        }
    }

    return {
        position: position,
        normal: normal,
        bsphere_center: center,
        bsphere_radius: radius
    };
};

// Miscellaneous functions to deal with 3D vectors
function dot(u, v) {
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

function minus(u, v) {
    return [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
}

function cross(u, v) {
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

function normsq(u) {
    return dot(u, u);
}

function norm(u) {
    return Math.sqrt(dot(u, u));
}

function mult(u, x) {
    return [u[0] * x, u[1] * x, u[2] * x];
}

export default GeoJSONToThree;
