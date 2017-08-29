import * as THREE from 'three';
import Earcut from 'earcut';

function coordinatesToMesh(coordinates) {
    if (!coordinates) {
        return;
    }
    // create geometry
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array(3 * coordinates.coordinates.length);
    let offset = 0;
    for (const coordinate of coordinates.coordinates) {
        vertices[offset] = coordinate._values[0];
        vertices[offset + 1] = coordinate._values[1];
        vertices[offset + 2] = coordinate._values[2];
        offset += 3;
    }

    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // build indice and instanciate mesh
    let result;
    switch (coordinates.type) {
        case 'point':
            result = new THREE.Points(geometry);
            break;
        case 'linestring': {
            const indices = [];
            /* eslint-disable guard-for-in */
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
            const indices = [];
            /* eslint-disable guard-for-in */
            for (const id in coordinates.featureVertices) {
                const polygon = coordinates.featureVertices[id];
                const contour = vertices.slice(polygon.offset * 3, (polygon.offset + polygon.count) * 3);
                const triangles = Earcut(contour, null, 3);
                for (const indice of triangles) {
                    indices.push(polygon.offset + indice);
                }
            }
            geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
            result = new THREE.Mesh(geometry);
            break;
        }
        default:
    }

    result.featureVertices = coordinates.featureVertices;

    return result;
}

function featureToThree(feature) {
    const mesh = coordinatesToMesh(feature.geometry);
    mesh.properties = feature.properties;
    return mesh;
}

function featureCollectionToThree(featureCollection) {
    const group = new THREE.Group();
    for (const geometry of featureCollection.geometries) {
        group.add(coordinatesToMesh(geometry));
    }
    group.features = featureCollection.features;
    return group;
}

export default {
    convert(feature) {
        if (feature.geometries) {
            return featureCollectionToThree(feature);
        } else {
            return featureToThree(feature);
        }
    },
};
