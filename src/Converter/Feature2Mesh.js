import * as THREE from 'three';
import Earcut from 'earcut';
import Coordinates from 'Core/Geographic/Coordinates';
import { FEATURE_TYPES } from 'Core/Feature';

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

function fillBatchIdArray(batchId, batchIdArray, start, end) {
    for (let i = start; i < end; i++) {
        batchIdArray[i] = batchId;
    }
}

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
        fnAltitude = id => altitude({}, coord.setFromArray(ptsIn, id));
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

const pointMaterial = new THREE.PointsMaterial();
function featureToPoint(feature, options) {
    const ptsIn = feature.vertices;
    const normals = feature.normals;
    const colors = new Uint8Array(ptsIn.length);
    const batchIds = options.batchId ?  new Uint32Array(ptsIn.length / 3) : undefined;
    let featureId = 0;

    let vertices;
    if (options.altitude !== 0) {
        vertices = new Float32Array(ptsIn.length);
        coordinatesToVertices(ptsIn, normals, vertices, options.altitude);
    } else {
        vertices = new Float32Array(ptsIn);
    }

    for (const geometry of feature.geometries) {
        const color = getProperty('color', options, randomColor, geometry.properties);
        const start = geometry.indices[0].offset;
        const count = geometry.indices[0].count;
        fillColorArray(colors, count, color, start);

        if (batchIds) {
            const id = options.batchId(geometry.properties, featureId);
            fillBatchIdArray(id, batchIds, start, start + count);
            featureId++;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    if (batchIds) { geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }

    const points = new THREE.Points(geom, pointMaterial);
    points.minAltitude = 0;
    return points;
}

var lineMaterial = new THREE.LineBasicMaterial();
function featureToLine(feature, options) {
    const ptsIn = feature.vertices;
    const normals = feature.normals;
    const colors = new Uint8Array(ptsIn.length);
    const count = ptsIn.length / 3;

    const batchIds = options.batchId ?  new Uint32Array(count) : undefined;
    let featureId = 0;

    let vertices;
    if (options.altitude !== 0) {
        vertices = new Float32Array(ptsIn.length);
        coordinatesToVertices(ptsIn, normals, vertices, options.altitude);
    } else {
        vertices = new Float32Array(ptsIn);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    let lines;

    if (feature.geometries.length > 1) {
        const countIndices = (count - feature.geometries.length) * 2;
        const indices = new Uint16Array(countIndices);
        let i = 0;
        // Multi line case
        for (const geometry of feature.geometries) {
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
                } else {
                    break;
                }
            }
            if (batchIds) {
                const id = options.batchId(geometry.properties, featureId);
                fillBatchIdArray(id, batchIds, start, end);
                featureId++;
            }
        }
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
        if (batchIds) { geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }
        geom.setIndex(new THREE.BufferAttribute(indices, 1));
        lines = new THREE.LineSegments(geom, lineMaterial);
    } else {
        const color = getProperty('color', options, randomColor, feature.geometries[0].properties);
        fillColorArray(colors, count, color);
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
        if (batchIds) {
            const id = options.batchId(feature.geometries[0].properties, featureId);
            fillBatchIdArray(id, batchIds, 0, count);
            geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));
        }
        lines = new THREE.Line(geom, lineMaterial);
    }
    lines.minAltitude = 0;
    return lines;
}

const color = new THREE.Color();
const material = new THREE.MeshBasicMaterial();
function featureToPolygon(feature, options) {
    const ptsIn = feature.vertices;
    const normals = feature.normals;
    const vertices = new Float32Array(ptsIn);
    const colors = new Uint8Array(ptsIn.length);
    const indices = [];
    vertices.minAltitude = Infinity;

    const batchIds = options.batchId ?  new Uint32Array(vertices.length / 3) : undefined;
    let featureId = 0;

    for (const geometry of feature.geometries) {
        const start = geometry.indices[0].offset;
        // To avoid integer overflow with indice value (16 bits)
        if (start > 0xffff) {
            console.warn('Feature to Polygon: integer overflow, too many points in polygons');
            break;
        }
        const color = getProperty('color', options, randomColor, geometry.properties);
        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;
        const count = end - start;
        const altitude = getProperty('altitude', options, 0, geometry.properties);
        if (altitude !== 0) {
            coordinatesToVertices(ptsIn, normals, vertices, altitude, 0, start, count);
        }
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
            fillBatchIdArray(id, batchIds, start, end);
            featureId++;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    if (batchIds) { geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

    const mesh = new THREE.Mesh(geom, material);
    mesh.minAltitude = isNaN(vertices.minAltitude) ? 0 : vertices.minAltitude;
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
    const ptsIn = feature.vertices;
    const offset = feature.geometries[0].indices[0].offset;
    const count = feature.geometries[0].indices[0].count;
    const isClockWise = area(ptsIn, offset, count) < 0;

    const normals = feature.normals;
    const vertices = new Float32Array(ptsIn.length * 2);
    const colors = new Uint8Array(ptsIn.length * 2);
    const indices = [];
    const totalVertices = ptsIn.length / 3;

    vertices.minAltitude = Infinity;

    const batchIds = options.batchId ?  new Uint32Array(vertices.length / 3) : undefined;
    let featureId = 0;

    for (const geometry of feature.geometries) {
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

        for (let i = 0; i < triangles.length; i++) {
            indices[startIndice + i] = triangles[i] + startTop;
        }

        for (const indice of geometry.indices) {
            addExtrudedPolygonSideFaces(
                indices,
                totalVertices,
                indice.offset,
                indice.count,
                isClockWise);
        }

        if (batchIds) {
            const id = options.batchId(geometry.properties, featureId);
            fillBatchIdArray(id, batchIds, start, end);
            fillBatchIdArray(id, batchIds, startTop, endTop);
            featureId++;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    if (batchIds) { geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1)); }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

    const mesh = new THREE.Mesh(geom, material);
    mesh.minAltitude = isNaN(vertices.minAltitude) ? 0 : vertices.minAltitude;
    return mesh;
}

/**
 * Convert a [Feature]{@link Feature} to a Mesh
 *
 * @param {Feature} feature - the feature to convert
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
        case FEATURE_TYPES.POINT:
            mesh = featureToPoint(feature, options);
            break;
        case FEATURE_TYPES.LINE:
            mesh = featureToLine(feature, options);
            break;
        case FEATURE_TYPES.POLYGON:
            if (options.extrude) {
                mesh = featureToExtrudedPolygon(feature, options);
            } else {
                mesh = featureToPolygon(feature, options);
            }
            break;
        default:
    }

    // set mesh material
    mesh.material.vertexColors = true;
    mesh.material.color = new THREE.Color(0xffffff);

    mesh.feature = feature;
    return mesh;
}

function featuresToThree(features, options) {
    if (!features || features.length == 0) { return; }

    if (features.length == 1) {
        coord.crs = features[0].crs;
        coord.setFromValues(0, 0, 0);
        return featureToMesh(features[0], options);
    }

    const group = new THREE.Group();
    group.minAltitude = Infinity;

    for (const feature of features) {
        coord.crs = feature.crs;
        coord.setFromValues(0, 0, 0);
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
