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
 * @param {number[]} indices - Indices of vertices
 * @param {number} length - total vertices count in the geom (excluding the extrusion ones)
 * @param {object} ring - ring needing side faces
 * @param {number} ring.offset - beginning of the ring
 * @param {number} ring.count - vertices count in the ring
 */
function addExtrudedPolygonSideFaces(indices, length, ring, isClockWise) {
    // loop over contour length, and for each point of the contour,
    // add indices to make two triangle, that make the side face
    for (let i = ring.offset; i < ring.offset + ring.count - 1; ++i) {
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


function geometryToPoint(geometry, properties, options, multiGeomAttributes) {
    const vertices = multiGeomAttributes ? multiGeomAttributes.vertices : geometry.vertices;

    // get altitude / color from properties
    const altitude = getAltitude(options, properties, vertices);
    const color = getColor(options, properties);

    const geom = prepareBufferGeometry(
        vertices,
        color,
        altitude);

    return new THREE.Points(geom);
}

function geometryToLine(geometry, properties, options, multiGeomAttributes) {
    const vertices = multiGeomAttributes ? multiGeomAttributes.vertices : geometry.vertices;

    // get altitude / color from properties
    const altitude = getAltitude(options, properties, vertices);
    const color = getColor(options, properties);

    const geom = prepareBufferGeometry(
        vertices,
        color,
        altitude);

    if (multiGeomAttributes) {
        const indices = [];
        // Multi line case
        for (let i = 0; i < geometry.length; i++) {
            const start = multiGeomAttributes.elements[i].offset;
            const end = multiGeomAttributes.elements[i].offset + multiGeomAttributes.elements[i].count;
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

function geometryToPolygon(geometry, properties, options, multiGeomAttributes) {
    const vertices = multiGeomAttributes ? multiGeomAttributes.vertices : geometry.vertices;

    // get altitude / color from properties
    const altitude = getAltitude(options, properties, vertices);
    const color = getColor(options, properties);

    const geom = prepareBufferGeometry(
        vertices,
        color,
        altitude);

    const indices = [];
    // Build indices
    if (multiGeomAttributes) {
        // Multi polygon case
        for (let i = 0; i < geometry.length; i++) {
            const holesOffsets = geometry[i].holes.map(h => h.offset);
            const start = multiGeomAttributes.elements[i].offset + geometry[i].contour.offset;
            const end = multiGeomAttributes.elements[i].offset + multiGeomAttributes.elements[i].count;
            const triangles = Earcut(geom.attributes.position.array.slice(start * 3, end * 3),
                holesOffsets,
                3);
            for (const indice of triangles) {
                indices.push(start + indice);
            }
        }
    } else {
        // Single polygon case
        const holesOffsets = geometry.holes.map(h => h.offset);
        const triangles = Earcut(geom.attributes.position.array, holesOffsets, 3);
        for (const indice of triangles) {
            indices.push(indice);
        }
    }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    return new THREE.Mesh(geom);
}


function geometryToExtrudedPolygon(geometry, properties, options, multiGeomAttributes) {
    const vertices = multiGeomAttributes ? multiGeomAttributes.vertices : geometry.vertices;

    // get altitude / color from properties
    const altitude = getAltitude(options, properties, vertices);
    const extrude = getExtrude(options, properties);

    const colors = [
        getColor(options, properties)];
    colors.push(colors[0].clone());
    colors[0].multiplyScalar(155 / 255);

    const geom = prepareBufferGeometry(
        vertices,
        colors,
        altitude,
        extrude);

    const indices = [];
    // Build indices
    if (multiGeomAttributes) {
        // Multi polygon case
        const isClockWise = THREE.ShapeUtils.isClockWise(
            vertices.slice(
                multiGeomAttributes.elements[0].offset + geometry[0].contour.offset,
                multiGeomAttributes.elements[0].offset +
                geometry[0].contour.offset +
                geometry[0].contour.count).map(c => c.xyz()));

        for (let i = 0; i < geometry.length; i++) {
            const holesOffsets = geometry[i].holes.map(h => h.offset);
            // triangulate the top face
            const start = vertices.length + multiGeomAttributes.elements[i].offset + geometry[i].contour.offset;
            const end = vertices.length + multiGeomAttributes.elements[i].offset + multiGeomAttributes.elements[i].count;
            const triangles = Earcut(geom.attributes.position.array.slice(start * 3, end * 3),
                holesOffsets,
                3);
            for (const indice of triangles) {
                indices.push(start + indice);
            }
            addExtrudedPolygonSideFaces(
                indices,
                vertices.length,
                {
                    count: geometry[i].contour.count,
                    offset: multiGeomAttributes.elements[i].offset + geometry[i].contour.offset,
                },
                isClockWise);
            if (holesOffsets.length > 0) {
                for (let j = 0; j < geometry[i].holes.length; j++) {
                    addExtrudedPolygonSideFaces(
                        indices,
                        vertices.length,
                        {
                            count: geometry[i].holes[j].count,
                            offset: multiGeomAttributes.elements[i].offset + geometry[i].holes[j].offset,
                        },
                        isClockWise);
                }
            }
        }
    } else {
        // Single polygon case
        const isClockWise = THREE.ShapeUtils.isClockWise(
            vertices.slice(geometry.contour.offset,
                geometry.contour.offset +
                geometry.contour.count).map(c => c.xyz()));

        const holesOffsets = geometry.holes.map(h => h.offset);
        const triangles = Earcut(geom.attributes.position.array.slice(
            vertices.length * 3), holesOffsets, 3);
        for (const indice of triangles) {
            indices.push(indice);
        }
        addExtrudedPolygonSideFaces(
            indices,
            vertices.length,
            geometry.contour,
            isClockWise);
        if (holesOffsets.length > 0) {
            for (let j = 0; j < geometry.holes.length; j++) {
                addExtrudedPolygonSideFaces(
                    indices,
                    vertices.length,
                    geometry.holes[j],
                    isClockWise);
            }
        }
    }

    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    return new THREE.Mesh(geom);
}

/**
 * Convert a [Feature]{@link Feature#geometry}'s geometry to a Mesh
 *
 * @param {Object} geometry - a Feature's geometry
 * @param {properties[]} properties - Feature's properties
 * @param {Object} options - options controlling the conversion
 * @param {number|function} options.altitude - define the base altitude of the mesh
 * @param {number|function} options.extrude - if defined, polygons will be extruded by the specified amount
 * @param {object|function} options.color - define per feature color
 * @return {THREE.Mesh} mesh
 */
function geometryToMesh(geometry, properties, options) {
    if (!geometry) {
        return;
    }

    // concat vertices of multigeometries in one big array
    let multiGeometries;
    if (geometry.type.indexOf('multi') == 0) {
        // vertices count
        let vertices = [];
        multiGeometries = {
            elements: [],
        };
        let offset = 0;
        for (let i = 0; i < geometry.length; i++) {
            vertices = vertices.concat(geometry[i].vertices);
            multiGeometries.elements.push({
                offset,
                count: geometry[i].vertices.length,
            });
            offset += geometry[i].vertices.length;
        }
        multiGeometries.vertices = vertices;
    }


    var mesh;
    switch (geometry.type) {
        case 'point':
        case 'multipoint': {
            mesh = geometryToPoint(geometry, properties, options, multiGeometries);
            break;
        }
        case 'linestring':
        case 'multilinestring': {
            mesh = geometryToLine(geometry, properties, options, multiGeometries);
            break;
        }
        case 'polygon':
        case 'multipolygon': {
            if (options.extrude) {
                mesh = geometryToExtrudedPolygon(
                    geometry,
                    properties,
                    options,
                    multiGeometries);
            }
            else {
                mesh = geometryToPolygon(
                    geometry,
                    properties,
                    options,
                    multiGeometries);
            }
            break;
        }
        default:
    }

    // set mesh material
    mesh.material.vertexColors = THREE.VertexColors;
    mesh.material.color = new THREE.Color(0xffffff);
    return mesh;
}

function featureToThree(feature, options) {
    const mesh = geometryToMesh(feature.geometry, feature.properties, options);
    mesh.properties = feature.properties;
    return mesh;
}

function featureCollectionToThree(featureCollection, options) {
    const group = new THREE.Group();
    group.minAltitude = Infinity;
    for (const feature of featureCollection) {
        const mesh = featureToThree(feature, options);
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
        return function _convert(feature) {
            if (!feature) return;

            if (Array.isArray(feature)) {
                return featureCollectionToThree(feature, options);
            } else {
                return featureToThree(feature, options);
            }
        };
    },
};
