/**
* Class: GeoJSONToThree
* Description: Converts GeoJSON features to ThreeJS geometries
*/


import * as THREE from 'three';
import earcut from 'earcut';

function GeoJSONToThree() {

}

GeoJSONToThree.convert = function(geoJson) {
    var geometries = [];
    var propertiesList = [];
    var geometrySize = [];
    var totalSize = 0;
    var features = geoJson.geometries.features;
    for (var f = 0; f < features.length; f++) {
        var coords = features[f].geometry.coordinates;
        var type = features[f].geometry.type;

        var geom = this.geomFromGeoJSON(type, coords);

        var threeGeom = this.geomToThree(geom);

        geometrySize.push(threeGeom.attributes.position.array.length / threeGeom.attributes.position.itemSize);
        totalSize += threeGeom.attributes.position.array.length / threeGeom.attributes.position.itemSize;

        // add properties
        var properties = features[f].properties;
        propertiesList.push(properties);
        geometries.push(threeGeom);
    }
    /*var mergedGeom = geometries[0];
    for (var i = 1; i < geometries.length; i++) {
        mergedGeom.merge(geometries[i]);
    }*/
    var mergedGeom = new THREE.BufferGeometry();
    mergedGeom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(totalSize*3),3));
    mergedGeom.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(totalSize*3),3));

    var offset = 0;
    for(var i = 0; i < geometries.length; i++) {
        mergedGeom.merge(geometries[i], offset);
        offset += geometrySize[i];
    }
    // Only position and normal attributes are merged automatically
    var geomIndexBuffer = new Float32Array(totalSize);
    var idx = 0;
    offset = geometrySize[0];
    for(i = 0; i < geomIndexBuffer.length; i++) {
        if(i >= offset) {
            idx++;
            offset += geometrySize[idx];
        }
        geomIndexBuffer[i] = idx;
    }
    mergedGeom.addAttribute('geometryIndex', new THREE.BufferAttribute(geomIndexBuffer,1));

    mergedGeom.computeBoundingSphere();

    this.setUpBarycentricCoordinates(mergedGeom);

    return {
        geometries: mergedGeom,
        properties: propertiesList
    };
};

GeoJSONToThree.setUpBarycentricCoordinates = function(geometry) {
    var positions = geometry.attributes.position.array;
    var normals = geometry.attributes.normal.array;

    // Build new attribute storing barycentric coordinates
    // for each vertex
    var centers = new THREE.BufferAttribute(new Float32Array(positions.length), 3);
    // start with all edges disabled
    for (var f = 0; f < positions.length; f++) { centers.array[f] = 1; }
    geometry.addAttribute( 'center', centers );

    // Hash all the edges and remember which face they're associated with
    // (Adapted from THREE.EdgesHelper)
    function sortFunction ( a, b ) {
        if (a[0] - b[0] !== 0) {
            return (a[0] - b[0]);
        } else if (a[1] - b[1] !== 0) {
            return (a[1] - b[1]);
        } else {
            return (a[2] - b[2]);
        }
    }
    var edge = [ 0, 0 ];
    var hash = {};
    var face;
    var numEdges = 0;

    for (var i = 0; i < positions.length/9; i++) {
        var a = i * 9;
        face = [ [ positions[a+0], positions[a+1], positions[a+2] ] ,
                 [ positions[a+3], positions[a+4], positions[a+5] ] ,
                 [ positions[a+6], positions[a+7], positions[a+8] ] ];
        for (var j = 0; j < 3; j++) {
            var k = (j + 1) % 3;
            var b = j * 3;
            var c = k * 3;
            edge[ 0 ] = face[ j ];
            edge[ 1 ] = face[ k ];
            edge.sort( sortFunction );
            key = edge[0] + ' | ' + edge[1];
            if ( hash[ key ] === undefined ) {
                hash[ key ] = {
                  face1: a,
                  face1vert1: a + b,
                  face1vert2: a + c,
                  face2: undefined,
                  face2vert1: undefined,
                  face2vert2: undefined
                };
                numEdges++;
            } else {
                hash[ key ].face2 = a;
                hash[ key ].face2vert1 = a + b;
                hash[ key ].face2vert2 = a + c;
            }
        }
    }

    for (var key in hash) {
        var h = hash[key];

        // ditch any edges that are bordered by two coplanar faces
        var normal1, normal2;
        if ( h.face2 !== undefined ) {
            normal1 = new THREE.Vector3(normals[h.face1+0], normals[h.face1+1], normals[h.face1+2]);
            normal2 = new THREE.Vector3(normals[h.face2+0], normals[h.face2+1], normals[h.face2+2]);
            if ( normal1.dot( normal2 ) >= 0.9999 ) { continue; }
        }

        // mark edge vertices as such by altering barycentric coordinates
        var otherVert;
        otherVert = 3 - (h.face1vert1 / 3) % 3 - (h.face1vert2 / 3) % 3;
        centers.array[h.face1vert1 + otherVert] = 0;
        centers.array[h.face1vert2 + otherVert] = 0;

        otherVert = 3 - (h.face2vert1 / 3) % 3 - (h.face2vert2 / 3) % 3;
        centers.array[h.face2vert1 + otherVert] = 0;
        centers.array[h.face2vert2 + otherVert] = 0;
    }
}

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

    //console.log(nPoints);
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
