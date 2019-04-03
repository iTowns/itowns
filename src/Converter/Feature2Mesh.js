import * as THREE from 'three';
import Earcut from 'earcut';
import Coordinates from 'Core/Geographic/Coordinates';

function getProperty(name, options, defaultValue, ...args) {
    const property = options[name];

    if (property) {
        if (typeof property === 'function') {
            const p = property(...args);
            if (p) {
                return p;
            }
        } else {
            return property;
        }
    }

    if (typeof defaultValue === 'function') {
        return defaultValue(...args);
    }

    return defaultValue;
}

function randomColor() {
    return new THREE.Color(Math.random() * 0xffffff);
}

function fillColorArray(colors, length, color, offset = 0) {
    offset *= 3;
    const len = offset + length * 3;
    for (let i = offset; i < len; i += 3) {
        colors[i] = color.r * 255;
        colors[i + 1] = color.g * 255;
        colors[i + 2] = color.b * 255;
    }
}

/*
function fillBatchIdArray(batchId, batchIdArray, start, end) {
    for (let i = start; i < end; i++) {
        batchIdArray[i] = batchId;
    }
}
*/

/**
 * Convert coordinates to vertices positionned at a given altitude
 *
 * @param      {number[]} ptsIn - Coordinates of a feature.
 * @param      {number[]} normals - Coordinates of a feature.
 * @param      {number[]} target - Target to copy result.
 * @param      {(Function|number)}  altitude - Altitude of feature or function to get altitude.
 * @param      {number} extrude - The extrude amount to apply at each point
 * @param      {number} offsetOut - The offset array value to copy on target
 * @param      {number} countIn - The count of coordinates to read in ptsIn
 * @param      {number} startIn - The offser array to strat reading in ptsIn
 */
const coord = new Coordinates('EPSG:4326', 0, 0);
function coordinatesToVertices(ptsIn, normals, target, altitude = 0, extrude = 0, offsetOut = 0, countIn = ptsIn.length / 3, startIn = offsetOut) {
    startIn *= 3;
    countIn *= 3;
    offsetOut *= 3;
    const endIn = startIn + countIn;
    let fnAltitude;
    if (!isNaN(altitude)) {
        fnAltitude = () => altitude;
    } else if (Array.isArray(altitude)) {
        fnAltitude = id => altitude[(id - startIn) / 3];
    } else {
        fnAltitude = id => altitude({}, coord.set(ptsIn.crs, ptsIn[id], ptsIn[id + 1], ptsIn[id + 2]));
    }

    for (let i = startIn, j = offsetOut; i < endIn; i += 3, j += 3) {
        // move the vertex following the normal, to put the point on the good altitude
        const t = fnAltitude(i) + (Array.isArray(extrude) ? extrude[(i - startIn) / 3] : extrude);
        if (target.minAltitude) {
            target.minAltitude = Math.min(t, target.minAltitude);
        }
        // fill the vertices array at the offset position
        target[j] = ptsIn[i] + normals[i] * t;
        target[j + 1] = ptsIn[i + 1] + normals[i + 1] * t;
        target[j + 2] = ptsIn[i + 2] + normals[i + 2] * t;
    }
}

/*
 * Add indices for the side faces.
 * We loop over the contour and create a side face made of two triangles.
 *
 * For a ring made of (n) coordinates, there are (n*2) vertices.
 * The (n) first vertices are on the roof, the (n) other vertices are on the floor.
 *
 * If index (i) is on the roof, index (i+length) is on the floor.
 *
 * @param {number[]} indices - Array of indices to push to
 * @param {number} length - Total vertices count in the geom (excluding the extrusion ones)
 * @param {number} offset
 * @param {number} count
 * @param {boolean} isClockWise - Wrapping direction
 */
/*
function addExtrudedPolygonSideFaces(indices, length, offset, count, isClockWise) {
    // loop over contour length, and for each point of the contour,
    // add indices to make two triangle, that make the side face
    const startIndice = indices.length;
    indices.length += (count - 1) * 6;
    for (let i = offset, j = startIndice; i < offset + count - 1; ++i, ++j) {
        if (isClockWise) {
            // first triangle indices
            indices[j] = i;
            indices[++j] = i + length;
            indices[++j] = i + 1;
            // second triangle indices
            indices[++j] = i + 1;
            indices[++j] = i + length;
            indices[++j] = i + length + 1;
        } else {
            // first triangle indices
            indices[j] = i + length;
            indices[++j] = i;
            indices[++j] = i + length + 1;
            // second triangle indices
            indices[++j] = i + length + 1;
            indices[++j] = i;
            indices[++j] = i + 1;
        }
    }
}
*/

// Ugly conversion, many coordinates created
// Todo: avoid converting to 4326
function addExtrudedPolygonSideFacesWithDup(vEdges, uvsEdges, uvs, arrVertices, vertices, indices, length, offset, count, isClockWise) {
    // loop over contour length, and for each point of the contour,
    // add indices to make two triangle, that make the side face
    const startIndice = indices.length;
    indices.length += (count - 1) * 6;


    for (let i = offset, j = startIndice; i < offset + count - 1; ++i, ++j) {
        if (isClockWise) {
            // first triangle indices

            indices[j] = i; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i + length; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i + 1; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);

            // second triangle indicesw
            indices[++j] = i + 1; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i + length; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i + length + 1; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);

            const uvCoordA = new Coordinates('EPSG:4978', vertices[indices[j - 5] * 3], vertices[indices[j - 5] * 3 + 1], vertices[indices[j - 5] * 3 + 2]).as('EPSG:4326');
            const uvCoordB = new Coordinates('EPSG:4978', vertices[indices[j - 4] * 3], vertices[indices[j - 4] * 3 + 1], vertices[indices[j - 4] * 3 + 2]).as('EPSG:4326');
            // const uvCoordC = new Coordinates('EPSG:4978', vertices[indices[j - 3] * 3], vertices[indices[j - 3] * 3 + 1], vertices[indices[j - 3] * 3 + 2]).as('EPSG:4326');
            const uvCoordD = new Coordinates('EPSG:4978', vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]).as('EPSG:4326');

            const h = uvCoordA._values[2] - uvCoordB._values[2];// uvCoordB._values[2] - uvCoordA._values[2];
            const l = Math.sqrt((uvCoordD._values[0] - uvCoordB._values[0]) * (uvCoordD._values[0] - uvCoordB._values[0]) + (uvCoordB._values[1] * uvCoordB._values[1]) * (uvCoordD._values[1] * uvCoordD._values[1]));

            uvs.push(0, h);
            uvs.push(0, 0);
            uvs.push(l, h);
            uvs.push(l, h);
            uvs.push(0, 0);
            uvs.push(l, 0);

            // For lines:
            vEdges.push(vertices[indices[j - 5] * 3], vertices[indices[j - 5] * 3 + 1], vertices[indices[j - 5] * 3 + 2]);
            vEdges.push(vertices[indices[j - 4] * 3], vertices[indices[j - 4] * 3 + 1], vertices[indices[j - 4] * 3 + 2]);

            vEdges.push(vertices[indices[j - 5] * 3], vertices[indices[j - 5] * 3 + 1], vertices[indices[j - 5] * 3 + 2]);
            vEdges.push(vertices[indices[j - 3] * 3], vertices[indices[j - 3] * 3 + 1], vertices[indices[j - 3] * 3 + 2]);
        } else {
            // first triangle indices
            indices[j] = i + length; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i + length + 1; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            // second triangle indices
            indices[++j] = i + length + 1; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);
            indices[++j] = i + 1; arrVertices.push(vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]);


            const uvCoordA = new Coordinates('EPSG:4978', vertices[indices[j - 5] * 3], vertices[indices[j - 5] * 3 + 1], vertices[indices[j - 5] * 3 + 2]).as('EPSG:4326');
            const uvCoordB = new Coordinates('EPSG:4978', vertices[indices[j - 4] * 3], vertices[indices[j - 4] * 3 + 1], vertices[indices[j - 4] * 3 + 2]).as('EPSG:4326');
            // const uvCoordC = new Coordinates('EPSG:4978', vertices[indices[j - 3] * 3], vertices[indices[j - 3] * 3 + 1], vertices[indices[j - 3] * 3 + 2]).as('EPSG:4326');
            const uvCoordD = new Coordinates('EPSG:4978', vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]).as('EPSG:4326');

            const h = uvCoordA._values[2] - uvCoordB._values[2];// uvCoordB._values[2] - uvCoordA._values[2];
            const l = Math.sqrt((uvCoordD._values[0] - uvCoordB._values[0]) * (uvCoordD._values[0] - uvCoordB._values[0]) + (uvCoordD._values[1] - uvCoordB._values[1]) * (uvCoordD._values[1] - uvCoordB._values[1]));

            uvs.push(0, h);
            uvs.push(0, 0);
            uvs.push(l, h);
            uvs.push(l, h);
            uvs.push(0, 0);
            uvs.push(l, 0);

            // For lines:

            vEdges.push(vertices[indices[j - 5] * 3], vertices[indices[j - 5] * 3 + 1], vertices[indices[j - 5] * 3 + 2]);
            vEdges.push(vertices[indices[j - 4] * 3], vertices[indices[j - 4] * 3 + 1], vertices[indices[j - 4] * 3 + 2]);

            vEdges.push(vertices[indices[j - 5] * 3], vertices[indices[j - 5] * 3 + 1], vertices[indices[j - 5] * 3 + 2]);
            vEdges.push(vertices[indices[j - 3] * 3], vertices[indices[j - 3] * 3 + 1], vertices[indices[j - 3] * 3 + 2]);

            // vEdges.push(vertices[indices[j-4] * 3 ], vertices[indices[j-4] * 3 +1], vertices[indices[j-4] * 3 +2]);
        }
    }
}


const pointMaterial = new THREE.PointsMaterial();
function featureToPoint(feature, options) {
    const ptsIn = feature.vertices;
    const normals = feature.normals;
    const vertices = new Float32Array(ptsIn.length);
    const colors = new Uint8Array(ptsIn.length);

    const batchIds = options.batchId ? new Uint32Array(ptsIn.length / 3) : undefined;
    let featureId = 0;

    coordinatesToVertices(ptsIn, normals, vertices, options.altitude);

    for (const geometry of feature.geometry) {
        const color = getProperty('color', options, randomColor, geometry.properties);
        const start = geometry.indices[0].offset;
        const count = geometry.indices[0].count;
        fillColorArray(colors, count, color, start);

        if (batchIds) {
            const id = options.batchId(geometry.properties, featureId);
            for (let i = start; i < start + count; i++) {
                batchIds[i] = id;
            }
            featureId++;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    if (batchIds) { geom.addAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }

    return new THREE.Points(geom, pointMaterial);
}

var lineMaterial = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors, transparent: true, opacity: 0.2 });

// Modified version for geovis team
function featureToLine(feature, options) {
    const ptsIn = feature.vertices;
    const normals = feature.normals;
    const vertices = new Float32Array(ptsIn.length);
    const colors = new Uint8Array(ptsIn.length);
    const count = ptsIn.length / 3;

    const batchIds = options.batchId ? new Uint32Array(count) : undefined;
    let featureId = 0;

    coordinatesToVertices(ptsIn, normals, vertices, options.altitude);
    // console.log(vertices);
    const geom = new THREE.BufferGeometry();

    var verticesUnindexed = [];
    var speed = [];

    if (feature.geometry.length > 1) {
        const countIndices = (count - feature.geometry.length) * 2;
        const indices = new Uint16Array(countIndices);
        let i = 0;
        // Multi line case
        for (const geometry of feature.geometry) {
            const color = getProperty('color', options, randomColor, geometry.properties);
            const start = geometry.indices[0].offset;
            // To avoid integer overflow with indice value (16 bits)
            if (start > 0xffff) {
                console.warn('Feature to Line: integer overflow, too many points in lines');
                break;
            }
            const count = geometry.indices[0].count;
            const end = start + count;
            fillColorArray(colors, count, color, start);
            for (let j = start; j < end - 1; j++) {
                if (j < 0xffff) {
                    indices[i++] = j;
                    indices[i++] = j + 1;

                    // Modification for unindexed and multiple lines overlapping. We add also other attributes such as random speed
                    verticesUnindexed.push(vertices[j * 3], vertices[j * 3 + 1], vertices[j * 3 + 2], vertices[(j + 1) * 3], vertices[(j + 1) * 3 + 1], vertices[(j + 1) * 3 + 2]);
                    speed.push(Math.random(), Math.random());
                    // We deplicate with noise the lines
                    var nDup = 0;
                    var coefNoise = 0.0;
                    for (var k = 0; k < nDup; ++k) {
                        verticesUnindexed.push(vertices[j * 3] + Math.random() * coefNoise, vertices[j * 3 + 1] + Math.random() * coefNoise, vertices[j * 3 + 2] + Math.random() * coefNoise,
                            vertices[(j + 1) * 3] + Math.random() * coefNoise, vertices[(j + 1) * 3 + 1] + Math.random() * coefNoise, vertices[(j + 1) * 3 + 2] + Math.random() * coefNoise);
                        speed.push(Math.random(), Math.random());
                    }
                } else {
                    break;
                }
            }
            if (batchIds) {
                const id = options.batchId(geometry.properties, featureId);
                for (let i = start; i < end; i++) {
                    batchIds[i] = id;
                }
                featureId++;
            }
        }
        //  itowns.proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
        // geom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(verticesUnindexed), 3));
        //   geom.addAttribute('positionLambert93', new THREE.BufferAttribute(new Float32Array(verticesUnindexed), 3));
        geom.addAttribute('speed', new THREE.BufferAttribute(new Float32Array(speed), 1));
        // geom.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
        if (batchIds) { geom.addAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }
        // geom.setIndex(new THREE.BufferAttribute(indices, 1));
        // console.log(geom);
        return new THREE.LineSegments(geom, /* materialLiness */ lineMaterial);
    } else {
        const color = getProperty('color', options, randomColor, feature.geometry.properties);
        fillColorArray(colors, count, color);
        geom.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
        if (batchIds) {
            const id = options.batchId(feature.geometry.properties, featureId);
            for (let i = 0; i < count; i++) {
                batchIds[i] = id;
            }
            geom.addAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));
        }

        return new THREE.Line(geom, lineMaterial);
    }
}


const color = new THREE.Color();
const material = new THREE.MeshBasicMaterial();
function featureToPolygon(feature, options) {
    const ptsIn = feature.vertices;
    const normals = feature.normals;
    const vertices = new Float32Array(ptsIn.length);
    const colors = new Uint8Array(ptsIn.length);
    const indices = [];
    vertices.minAltitude = Infinity;

    const batchIds = options.batchId ? new Uint32Array(vertices.length / 3) : undefined;
    let featureId = 0;

    for (const geometry of feature.geometry) {
        const altitude = getProperty('altitude', options, 0, geometry.properties);
        const color = getProperty('color', options, randomColor, geometry.properties);

        const start = geometry.indices[0].offset;
        // To avoid integer overflow with indice value (16 bits)
        if (start > 0xffff) {
            console.warn('Feature to Polygon: integer overflow, too many points in polygons');
            break;
        }

        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;
        const count = end - start;

        coordinatesToVertices(ptsIn, normals, vertices, altitude, 0, start, count);
        fillColorArray(colors, count, color, start);

        const geomVertices = vertices.slice(start * 3, end * 3);
        const holesOffsets = geometry.indices.map(i => i.offset - start).slice(1);
        const triangles = Earcut(geomVertices, holesOffsets, 3);

        const startIndice = indices.length;
        indices.length += triangles.length;

        for (let i = 0; i < triangles.length; i++) {
            indices[startIndice + i] = triangles[i] + start;
        }

        if (batchIds) {
            const id = options.batchId(geometry.properties, featureId);
            for (let i = start; i < end; i++) {
                batchIds[i] = id;
            }
            featureId++;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.isBufferGeometry = true;
    geom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    if (batchIds) { geom.addAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

    const mesh = new THREE.Mesh(geom, material);
    mesh.minAltitude = vertices.minAltitude;
    return mesh;
}

function area(contour, offset, count) {
    offset *= 3;
    const n = count * 3;
    let a = 0.0;

    for (let p = n + offset - 3, q = offset; q < n; p = q, q += 3) {
        a += contour[p] * contour[q + 1] - contour[q] * contour[p + 1];
    }

    return a * 0.5;
}


function featureToExtrudedPolygon(feature, options) {
    // console.log("featureToExtrudedPolygon", feature);
    const ptsIn = feature.vertices;
    // const originalCoords = feature.vertices.slice();  // We clone original coord
    const offset = feature.geometry[0].indices[0].offset;
    const count = feature.geometry[0].indices[0].count;
    const isClockWise = area(ptsIn, offset, count) < 0;

    const normals = feature.normals;
    const vertices = new Float32Array(ptsIn.length * 2);
    const colors = new Uint8Array(ptsIn.length * 2);
    const indices = [];
    const totalVertices = ptsIn.length / 3;

    vertices.minAltitude = Infinity;

    // Alex mod to have 3 meshes with uvmap in degree: 1 for the roof, 1 for wall and 1 for edges
    var verticesRoofWithDup = [];
    var verticesWallsWithDup = [];
    var uvsRoofWithDup = [];
    var uvsWallsWithDup = [];
    var verticesEdges = [];
    var uvsEdges = [];

    const attributeNames = options.attributes ? Object.keys(options.attributes) : [];
    for (const attributeName of attributeNames) {
        const attribute = options.attributes[attributeName];
        attribute.normalized = attribute.normalized || false;
        attribute.itemSize = attribute.itemSize || 1;
        attribute.array = new (attribute.type)(2 * totalVertices * attribute.itemSize);
    }
    const batchIds = options.batchId ?  [] /* new Uint32Array(vertices.length / 3) */ : undefined;
    const batchIdsWalls = options.batchId ?  [] /* new Uint32Array(vertices.length / 3) */ : undefined;
    let featureId = 0;
    let id;


    for (const geometry of feature.geometry) {
        const altitude = getProperty('altitude', options, 0, geometry.properties);
        const extrude = getProperty('extrude', options, 0, geometry.properties);

        const colorTop = getProperty('color', options, randomColor, geometry.properties);
        color.copy(colorTop);
        color.multiplyScalar(0.6);

        const start = geometry.indices[0].offset;
        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;
        const count = end - start;

        coordinatesToVertices(ptsIn, normals, vertices, altitude, 0, start, count);
        fillColorArray(colors, count, color, start);

        const startTop = start + totalVertices;
        const endTop = end + totalVertices;
        coordinatesToVertices(ptsIn, normals, vertices, altitude, extrude, startTop, count, start);
        fillColorArray(colors, count, colorTop, startTop);

        const geomVertices = vertices.slice(startTop * 3, endTop * 3);
        const holesOffsets = geometry.indices.map(i => i.offset - start).slice(1);
        const triangles = Earcut(geomVertices, holesOffsets, 3);

        const startIndice = indices.length;
        indices.length += triangles.length;

        if (batchIds) {
            id = options.batchId(geometry.properties, featureId);
        }

        for (let i = 0; i < triangles.length; i++) {
            indices[startIndice + i] = triangles[i] + startTop;
            verticesRoofWithDup.push(geomVertices[triangles[i] * 3 + 0]);
            verticesRoofWithDup.push(geomVertices[triangles[i] * 3 + 1]);
            verticesRoofWithDup.push(geomVertices[triangles[i] * 3 + 2]);

            var posWGS = new THREE.Vector3(geomVertices[triangles[i] * 3 + 0], geomVertices[triangles[i] * 3 + 1], geomVertices[triangles[i] * 3 + 2]);
            var c = new Coordinates('EPSG:4978', posWGS.x, posWGS.y, posWGS.z).as('EPSG:4326'); // Geocentric coordinates
            uvsRoofWithDup.push((c._values[0]), (c._values[1]));

            // BatchIDS new
            if (batchIds) {
                // const id = options.batchId(geometry.properties, featureId);
                batchIds.push(id);
            }
        }

        var l0 = verticesWallsWithDup.length;

        for (const indice of geometry.indices) {
            addExtrudedPolygonSideFacesWithDup(
                verticesEdges,
                uvsEdges,
                uvsWallsWithDup,
                verticesWallsWithDup,
                vertices,
                indices,
                totalVertices,
                indice.offset,
                indice.count,
                isClockWise);
        }

        var l = (verticesWallsWithDup.length - l0) / 3; // We added n trianges  = l / 3  (3 for x,y,z)
        // BatchIDS new
        if (batchIdsWalls) {
            for (var h = 0; h < l; h++) {
                batchIdsWalls.push(id);
            }
        }

        if (batchIds) {
            featureId++;
        }
    }

    // Shader test for roof
    function createMaterial(vShader, fShader) {
        const uniforms = {
            waterLevel: { type: 'f', value: 0.0 },
            opacity: { type: 'f', value: 1.0 },
            z0: { type: 'f', value: 0.0 },
            z1: { type: 'f', value: 2.0 },
            // color0: {type: 'c', value: new THREE.Color(0x888888)},
            color0: { type: 'c', value: new THREE.Color(0x006600) },
            color1: { type: 'c', value: new THREE.Color(0xbb0000) },
            // color1: {type: 'c', value: new THREE.Color(0x4444ff)},
        };

        const meshMaterial = new THREE.ShaderMaterial({
            // uniforms: uniforms,
            uniforms,
            vertexShader: vShader,
            fragmentShader: fShader,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        return meshMaterial;
    }

    const vertexShader = `
    #include <logdepthbuf_pars_vertex>
    uniform float waterLevel;
    uniform float opacity;
    uniform vec3 color0;
    uniform vec3 color1;
    uniform float z0;
    uniform float z1;

    varying vec2 vUv;

    void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
    }
    `;

    const fragmentShader = `
    #include <logdepthbuf_pars_fragment>
    varying vec2 vUv;
    void main(){
        #include <logdepthbuf_fragment>
        vec2 normUV = vec2(mod(vUv.x * 10000., 1.), mod(vUv.y * 10000., 1.));
        gl_FragColor = vec4(normUV.x, normUV.y,0., 1.);
    }
    `;

    const shadMat = createMaterial(vertexShader, fragmentShader);

    // WALLS
    // console.log(uvsWallsWithDup);
    const geom = new THREE.BufferGeometry();
    geom.isBufferGeometry = true;
    geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(verticesWallsWithDup /* verticesRoofWithDup *//* newVertices */) /* vertices */, 3));
    geom.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvsWallsWithDup) /* vertices */, 2));
    if (batchIdsWalls) { geom.addAttribute('batchId', new THREE.BufferAttribute(new Float32Array(batchIdsWalls), 1)); }
    // console.log(uvsWallsWithDup);
    // geom.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));

    //   geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    // var texture = new THREE.TextureLoader().load('./textures/slatetile.jpg');
    var mat = new THREE.MeshBasicMaterial({ /* map: texture */  color: new THREE.Color(Math.random() * 0xffff00),  wireframe: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.minAltitude = vertices.minAltitude;


    // ROOF
    const geomRoof = new THREE.BufferGeometry();
    geomRoof.addAttribute('position', new THREE.BufferAttribute(new Float32Array(verticesRoofWithDup /* newVertices */) /* vertices */, 3));
    geomRoof.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvsRoofWithDup) /* vertices */, 2));
    if (batchIds) { geomRoof.addAttribute('batchId', new THREE.BufferAttribute(new Float32Array(batchIds), 1)); }

    // var textureRoof = new THREE.TextureLoader().load('./textures/slatetile.jpg');
    // var matRoof = new THREE.MeshBasicMaterial({ /* map: textureRoof, */  color: new THREE.Color(Math.random() * 0xffff00), wireframe: true });
    const meshRoof = new THREE.Mesh(geomRoof, shadMat/* matRoof */);
    meshRoof.minAltitude = vertices.minAltitude;

    // EDGES
    const geomEdges = new THREE.BufferGeometry();
    // console.log(verticesEdges);
    geomEdges.addAttribute('position', new THREE.BufferAttribute(new Float32Array(verticesEdges /* newVertices */) /* vertices */, 3));
    // if (batchIds) { geomEdges.addAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }
    // geomEdges.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvsEdges)/*vertices*/, 2));
    // var textureEdges = new THREE.TextureLoader().load('./textures/slatetile.jpg');
    var matEdges = new THREE.LineBasicMaterial({ /* map:textureEdges, */ /* color: new THREE.Color(Math.random() * 0xffff00), */ });
    const meshEdges = new THREE.LineSegments(geomEdges, matEdges);
    meshEdges.minAltitude = vertices.minAltitude;


    var meshGroup = new THREE.Group();
    meshGroup.add(mesh);
    meshGroup.add(meshRoof);
    meshGroup.add(meshEdges);

    // console.log("meshGroup: ",meshGroup);
    return meshGroup; // mesh;
}

/**
 * Convert a [Feature]{@link Feature#geometry}'s geometry to a Mesh
 *
 * @param {Object} feature - a Feature's geometry
 * @param {Object} options - options controlling the conversion
 * @param {number|function} options.altitude - define the base altitude of the mesh
 * @param {number|function} options.extrude - if defined, polygons will be extruded by the specified amount
 * @param {object|function} options.color - define per feature color
 * @return {THREE.Mesh} mesh
 */
function featureToMesh(feature, options) {
    if (!feature.vertices) {
        return;
    }

    var mesh;
    switch (feature.type) {
        case 'point':
        case 'multipoint': {
            mesh = featureToPoint(feature, options);
            break;
        }
        case 'linestring':
        case 'multilinestring': {
            mesh = featureToLine(feature, options);
            break;
        }
        case 'polygon':
        case 'multipolygon': {
            if (options.extrude) {
                mesh = featureToExtrudedPolygon(feature, options);
            } else {
                mesh = featureToPolygon(feature, options);
            }
            break;
        }
        default:
    }

    // set mesh material
    if (mesh.isGroup) {
        mesh.children.forEach((child) => {
            // child.material.vertexColors = THREE.VertexColors;
            // child.material.color = new THREE.Color(0xffffff);
            child.feature = feature;
        });
    } else {
        mesh.material.vertexColors = THREE.VertexColors;
        mesh.material.color = new THREE.Color(0xffffff);
        mesh.feature = feature;
    }
    return mesh;
}

function featuresToThree(features, options) {
    if (!features || features.length == 0) { return; }

    if (features.length == 1) {
        return featureToMesh(features[0], options);
    }

    const group = new THREE.Group();
    group.minAltitude = Infinity;

    for (const feature of features) {
        const mesh = featureToMesh(feature, options);
        group.add(mesh);
        group.minAltitude = Math.min(mesh.minAltitude, group.minAltitude);
    }

    return group;
}

/**
 * @module Feature2Mesh
 */
export default {
    /**
     * Return a function that converts [Features]{@link module:GeoJsonParser} to Meshes. Feature collection will be converted to a
     * a THREE.Group.
     *
     * @param {Object} options - options controlling the conversion
     * @param {number|function} options.altitude - define the base altitude of the mesh
     * @param {number|function} options.extrude - if defined, polygons will be extruded by the specified amount
     * @param {object|function} options.color - define per feature color
     * @param {function} [options.batchId] - optional function to create batchId attribute. It is passed the feature property and the feature index. As the batchId is using an unsigned int structure on 32 bits, the batchId could be between 0 and 4,294,967,295.
     * @return {function}
     * @example <caption>Example usage of batchId with featureId.</caption>
     * view.addLayer({
     *     id: 'WFS Buildings',
     *     type: 'geometry',
     *     update: itowns.FeatureProcessing.update,
     *     convert: itowns.Feature2Mesh.convert({
     *         color: colorBuildings,
     *         batchId: (property, featureId) => featureId,
     *         altitude: altitudeBuildings,
     *         extrude: extrudeBuildings }),
     *     onMeshCreated: function scaleZ(mesh) {
     *         mesh.scale.z = 0.01;
     *         meshes.push(mesh);
     *     },
     *     filter: acceptFeature,
     *     source,
     * });
     *
     * @example <caption>Example usage of batchId with property.</caption>
     * view.addLayer({
     *     id: 'WFS Buildings',
     *     type: 'geometry',
     *     update: itowns.FeatureProcessing.update,
     *     convert: itowns.Feature2Mesh.convert({
     *         color: colorBuildings,
     *         batchId: (property, featureId) => property.house ? 10 : featureId,
     *         altitude: altitudeBuildings,
     *         extrude: extrudeBuildings }),
     *     onMeshCreated: function scaleZ(mesh) {
     *         mesh.scale.z = 0.01;
     *         meshes.push(mesh);
     *     },
     *     filter: acceptFeature,
     *     source,
     * });
     */
    convert(options = {}) {
        return function _convert(collection) {
            if (!collection) { return; }

            return featuresToThree(collection.features, options);
        };
    },
};
