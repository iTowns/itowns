import * as THREE from 'three';
import Earcut from 'earcut';

function getAltitude(options, properties, contour) {
    if (options.altitude) {
        if (typeof options.altitude === 'function') {
            return options.altitude(properties, contour);
        } else {
            return options.altitude;
        }
    }
    return 0;
}

function getExtrude(options, properties) {
    if (options.extrude) {
        if (typeof options.extrude === 'function') {
            return options.extrude(properties);
        } else {
            return options.extrude;
        }
    }
    return 0;
}

function randomColor() {
    const randomColor = new THREE.Color();
    randomColor.setHex(Math.random() * 0xffffff);
    return randomColor;
}

function getColor(options, properties) {
    if (options.color) {
        if (typeof options.color === 'function') {
            return options.color(properties);
        } else {
            return options.color;
        }
    }
    return randomColor();
}

function fillColorArray(colors, length, r, g, b, offset) {
    const len = offset + length;
    for (let i = offset; i < len; ++i) {
        colors[3 * i] = r;
        colors[3 * i + 1] = g;
        colors[3 * i + 2] = b;
    }
}

/*
 * Convert coordinates to vertices positionned at a given altitude
 *
 * @param  {Coordinate[]} contour - Coordinates of a feature
 * @param  {number | number[] } altitude - Altitude of the feature
 * @return {Vector3[]} vertices
 */
const vec = new THREE.Vector3();
function coordinatesToVertices(contour, altitude, target, offset = 0, extrude = undefined) {
    // loop over contour coodinates
    for (let i = 0; i < contour.length; i++) {
        const coordinate = contour[i];
        // convert coordinate to position
        coordinate.xyz(vec);
        // move the vertex following the normal, to put the point on the good altitude
        vec.addScaledVector(coordinate.geodesicNormal,
            Array.isArray(altitude) ? altitude[i] : altitude);
        if (extrude) {
            vec.addScaledVector(coordinate.geodesicNormal,
                Array.isArray(extrude) ? extrude[i] : extrude);
        }
        // fill the vertices array at the offset position
        vec.toArray(target, offset);
        offset += 3;
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
    for (let i = offset; i < offset + count - 1; ++i) {
        if (isClockWise) {
            // first triangle indices
            indices.push(i);
            indices.push(i + length);
            indices.push(i + 1);
            // second triangle indices
            indices.push(i + 1);
            indices.push(i + length);
            indices.push(i + length + 1);
        } else {
            // first triangle indices
            indices.push(i + length);
            indices.push(i);
            indices.push(i + length + 1);
            // second triangle indices
            indices.push(i + length + 1);
            indices.push(i);
            indices.push(i + 1);
        }
    }
}

function prepareBufferGeometry(vert, color, altitude, extrude) {
    const multiplyVerticesCount = (extrude == undefined) ? 1 : 2;

    const vertices = new Float32Array(3 * vert.length * multiplyVerticesCount);
    const colors = new Uint8Array(3 * vert.length * multiplyVerticesCount);

    if (multiplyVerticesCount == 1) {
        coordinatesToVertices(vert, altitude, vertices);
        fillColorArray(colors, vert.length, color.r * 255, color.g * 255, color.b * 255, 0);
    } else {
        coordinatesToVertices(vert, altitude, vertices, 0);
        fillColorArray(colors, vert.length, color[0].r * 255, color[0].g * 255, color[0].b * 255, 0);

        coordinatesToVertices(vert, altitude, vertices, 3 * vert.length, extrude);
        fillColorArray(colors, vert.length, color[1].r * 255, color[1].g * 255, color[1].b * 255, vert.length);
    }

    const geom = new THREE.BufferGeometry();
    geom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    return geom;
}


function featureToPoint(feature, properties, options) {
    // get altitude / color from properties
    const altitude = getAltitude(options, properties, feature.vertices);
    const color = getColor(options, properties);

    const geom = prepareBufferGeometry(
        feature.vertices,
        color,
        altitude);

    return new THREE.Points(geom);
}

function featureToLine(feature, properties, options) {
    // get altitude / color from properties
    const altitude = getAltitude(options, properties, feature.vertices);
    const color = getColor(options, properties);

    const geom = prepareBufferGeometry(
        feature.vertices,
        color,
        altitude);

    if (feature.geometry.length > 1) {
        const indices = [];
        // Multi line case
        for (const geometry of feature.geometry) {
            const start = geometry.indices[0].offset;
            const end = start + geometry.indices[0].count;
            for (let j = start; j < end; j++) {
                indices.push(j);
                indices.push(j + 1);
            }
        }
        geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
        return new THREE.LineSegments(geom);
    } else {
        return new THREE.Line(geom);
    }
}

function featureToPolygon(feature, properties, options) {
    // get altitude / color from properties
    const altitude = getAltitude(options, properties, feature.vertices);
    const color = getColor(options, properties);

    const geom = prepareBufferGeometry(
        feature.vertices,
        color,
        altitude);

    let indices = [];
    for (const geometry of feature.geometry) {
        const start = geometry.indices[0].offset;
        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;

        const holesOffsets = geometry.indices.map(i => i.offset - start).slice(1);

        const triangles = Earcut(geom.attributes.position.array.slice(start * 3, end * 3),
                holesOffsets, 3);

        indices = indices.concat(triangles.map(i => i + start));
    }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    return new THREE.Mesh(geom);
}


function featureToExtrudedPolygon(feature, properties, options) {
    // get altitude / color from properties
    const altitude = getAltitude(options, properties, feature.vertices);
    const extrude = getExtrude(options, properties);

    const colors = [getColor(options, properties)];
    colors.push(colors[0].clone());
    colors[0].multiplyScalar(155 / 255);

    const geom = prepareBufferGeometry(
        feature.vertices,
        colors,
        altitude,
        extrude);

    const isClockWise = THREE.ShapeUtils.isClockWise(
        feature.vertices.slice(feature.geometry[0].indices[0].offset,
            feature.geometry[0].indices[0].offset +
            feature.geometry[0].indices[0].count).map(c => c.xyz()));

    let indices = [];
    for (const geometry of feature.geometry) {
        const start = geometry.indices[0].offset;
        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;

        const holesOffsets = geometry.indices.map(i => i.offset - start).slice(1);

        const triangles = Earcut(geom.attributes.position.array.slice(start * 3, end * 3),
                holesOffsets, 3);

        indices = indices.concat(triangles.map(i => i + start + feature.vertices.length));

        for (const indice of geometry.indices) {
            addExtrudedPolygonSideFaces(
                indices,
                feature.vertices.length,
                indice.offset,
                indice.count,
                isClockWise);
        }
    }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    return new THREE.Mesh(geom);
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
            mesh = featureToPoint(feature, feature.properties, options);
            break;
        }
        case 'linestring':
        case 'multilinestring': {
            mesh = featureToLine(feature, feature.properties, options);
            break;
        }
        case 'polygon':
        case 'multipolygon': {
            if (options.extrude) {
                mesh = featureToExtrudedPolygon(
                    feature,
                    feature.properties,
                    options);
            }
            else {
                mesh = featureToPolygon(
                    feature,
                    feature.properties,
                    options);
            }
            break;
        }
        default:
    }

    // set mesh material
    mesh.material.vertexColors = THREE.VertexColors;
    mesh.material.color = new THREE.Color(0xffffff);

    mesh.properties = feature.properties;

    return mesh;
}

function featuresToThree(features, options) {
    if (!features || features.length == 0) return;

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
     * @return {function}
     */
    convert(options = {}) {
        return function _convert(collection) {
            if (!collection) return;

            return featuresToThree(collection.features, options);
        };
    },
};
