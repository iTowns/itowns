import * as THREE from 'three';
import Earcut from 'earcut';

/*
 * Convert coordinates to vertices positionned at a given altitude
 *
 * @param  {Coordinate[]} contour - Coordinates of a feature
 * @param  {number} altitude - Altitude of the feature
 * @return {Vector3[]} vertices
 */
function coordinatesToVertice(contour, altitude) {
    // position in the vertices result
    let offset = 0;
    const vertices = new Array(contour.length * 3);
    // loop over contour coodinates
    for (const coordinate of contour) {
        // convert coordinate to position
        const vec = coordinate.xyz();
        // get the normal vector. if normal is undefined, it's the DefaultUp for planar mode
        const normal = coordinate.normal ? coordinate.normal : THREE.Object3D.DefaultUp;
        // move the vertex following the normal, to put the point on the good altitude
        vec.add(normal.clone().multiplyScalar(altitude));
        // fill the vertices array at the offset position
        vec.toArray(vertices, offset);
        // increment the offset
        offset += 3;
    }
    return vertices;
}

/*
 * Helper function to extract, for a given feature id, the feature contour coordinates, and it's properties.
 *
 * @param  {structure with coordinate[] and featureVertices[]} coordinates - representation of the features
 * @param  {properties[]} properties - properties of the features
 * @param  {number} id - id of the feature
 * @return {Coordinate[], propertie[] } {contour, properties}
 */
function extractFeature(coordinates, properties, id) {
    const featureVertices = coordinates.featureVertices[id];
    const contour = coordinates.coordinates.slice(featureVertices.offset, featureVertices.offset + featureVertices.count);
    const propertie = properties[id].properties.properties;
    return { contour, propertie };
}

/*
 * Convert all feature coordinates to vertices.
 * Read the altitude of each feature in the properties using the function given in the style.altitude(properties).
 *
 * @param  {structure with coordinate[] and featureVertices[]} coordinates - representation of all the features
 * @param  {properties[]} properties - properties of all the features
 * @param  {style} style define a function altitude to read altitude from feature properties.
 * @return {Vector3[]} Vertices of the features.
 */
function featuresCoordinatesToVertice(coordinates, properties, style = {}) {
    let vertices = [];
    /* eslint-disable guard-for-in */
    for (const id in coordinates.featureVertices) {
        const { contour, propertie } = extractFeature(coordinates, properties, id);
        // get altitude from properties
        const altitude = style.altitude ? style.altitude(propertie) : 0;
        const newVertices = coordinatesToVertice(contour, altitude);
        vertices = vertices.concat(newVertices);
    }
    return vertices;
}

/*
 * Add indices for the side faces.
 * We loop over the contour and create a side face made of two triangles.
 *
 * For a contour made of (n) coordinates, there are (n*2) vertices.
 * The (n) first vertices are on the roof, the (n) other vertices are on the floor.
 *
 * If index (i) is on the roof, index (i+length) is on the floor.
 *
 * @param {number[]} indices - Indices of vertices
 * @param {number} length - length of the contour of the feature
 * @param {number} offset - index of the first vertice of this feature
 */
function addFaces(indices, length, offset) {
    // loop over contour length, and for each point of the contour,
    // add indices to make two triangle, that make the side face
    for (let i = offset; i < offset + length - 1; ++i) {
        // first triangle indices
        indices.push(i);
        indices.push(i + length);
        indices.push(i + 1);
        // second triangle indices
        indices.push(i + 1);
        indices.push(i + length);
        indices.push(i + length + 1);
    }
}

/*
 * Convert all feature coordinates in one mesh.
 *
 * Read the altitude of each feature in the properties of the feature, using the function given in the param style : style.altitude(properties).
 * For polygon, read extrude amout using the function given in the param style.extrude(properties).
 *
 * @param  {structure with coordinate[] and featureVertices[]} coordinates - representation of all the features
 * @param  {properties[]} properties - properties of all the features
 * @param  {style} style defines two functions to read altitude and extrude amout from feature properties
 * @return {THREE.Mesh} mesh
 */
function coordinatesToMesh(coordinates, properties, style = {}) {
    if (!coordinates) {
        return;
    }
    // create geometry
    const geometry = new THREE.BufferGeometry();
    const indices = [];
    let vertices = [];
    // build indice and instanciate mesh
    let result;
    switch (coordinates.type) {
        case 'point': {
            vertices = featuresCoordinatesToVertice(coordinates, properties, style);
            geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            result = new THREE.Points(geometry);
            break;
        }
        case 'linestring': {
            /* eslint-disable guard-for-in */
            vertices = featuresCoordinatesToVertice(coordinates, properties, style);
            geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));

            for (const id in coordinates.featureVertices) {
                const line = coordinates.featureVertices[id];
                // TODO optimize indices lines
                // is the same array each time
                for (let i = line.offset; i < line.offset + line.count - 1; ++i) {
                    indices.push(i);
                    indices.push(i + 1);
                }
            }
            geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
            result = new THREE.LineSegments(geometry);
            break;
        }
        case 'polygon': {
            let offset = 0;
            /* eslint-disable guard-for-in */
            for (const id in coordinates.featureVertices) {
                // extract contour coodinates and properties of one feature
                const { contour, propertie } = extractFeature(coordinates, properties, id);
                // get altitude and extrude amount from properties
                const altitudeBottom = style.altitude ? style.altitude(propertie) : 0;
                const extrudeAmount = style.extrude ? style.extrude(propertie) : 0;
                // altitudeTopFace is the altitude of the visible top face.
                // if the polygon is extruded, it's the roof, if it's not extruded, it's the floor.
                const altitudeTopFace = style.extrude ? altitudeBottom + extrudeAmount : altitudeBottom;
                // add vertices of the top face
                const verticesTopFace = coordinatesToVertice(contour, altitudeTopFace);
                vertices = vertices.concat(verticesTopFace);
                // triangulate the top face
                const triangles = Earcut(verticesTopFace, null, 3);
                for (const indice of triangles) {
                    indices.push(offset + indice);
                }
                // if we extrude the polygone
                if (style.extrude) {
                    // add vertices of the bottom face
                    const verticesBottom = coordinatesToVertice(contour, altitudeBottom);
                    vertices = vertices.concat(verticesBottom);
                    // add indices to make the side faces
                    addFaces(indices, contour.length, offset);
                    // increment offset, there is twice many vertices if polygone is extruded.
                    offset += contour.length;
                }
                // increment offset
                offset += contour.length;
            }
            geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
            result = new THREE.Mesh(geometry);

            // store 'isExtrude' in the mesh. Will be used in FeatureProcessing for colorisation.
            result.isExtruded = style.extrude;
            break;
        }
        default:

    }
    result.featureVertices = coordinates.featureVertices;
    return result;
}

function featureToThree(feature, style) {
    const mesh = coordinatesToMesh(feature.geometry, feature.properties, style);
    mesh.properties = feature.properties;
    return mesh;
}

function featureCollectionToThree(featureCollection, style) {
    const group = new THREE.Group();
    for (const geometry of featureCollection.geometries) {
        const properties = featureCollection.features;
        group.add(coordinatesToMesh(geometry, properties, style));
    }
    group.features = featureCollection.features;
    return group;
}

export default {
    convert(feature, style) {
        if (!feature) return;
        if (feature.geometries) {
            return featureCollectionToThree(feature, style);
        } else {
            return featureToThree(feature, style);
        }
    },
};

