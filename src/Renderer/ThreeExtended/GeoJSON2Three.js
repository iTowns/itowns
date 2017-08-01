/**
 * Generated On: 2016-09-28
 * Class: FeatureToolBox
 * Description:
 */

import * as THREE from 'three';
import Earcut from 'earcut';
import Coordinates from '../../Core/Geographic/Coordinates';

function readCRS(json) {
    if (json.crs) {
        if (json.crs.type.toLowerCase() == 'epsg') {
            return `EPSG:${json.crs.properties.code}`;
        } else if (json.crs.type.toLowerCase() == 'name') {
            const epsgIdx = json.crs.properties.name.toLowerCase().indexOf('epsg:');
            if (epsgIdx >= 0) {
                // authority:version:code => EPSG:[...]:code
                const codeStart = json.crs.properties.name.indexOf(':', epsgIdx + 5);
                if (codeStart > 0) {
                    return `EPSG:${json.crs.properties.name.substr(codeStart + 1)}`;
                }
            }
        }
        throw new Error(`Unsupported CRS type '${json.crs}'`);
    }
    // assume default crs
    return 'EPSG:4236';
}

function readCoordinates(crsIn, crsOut, coordinates) {
    // coordinates is a list of pair [[x1, y1], [x2, y2], ..., [xn, yn]]
    const out = [];
    for (const pair of coordinates) {
        // TODO: 1 is a default z value, makes this configurable
        const coords = new Coordinates(crsIn, pair[0], pair[1], 1);
        if (crsIn === crsOut) {
            out.push(coords);
        } else {
            out.push(coords.as(crsOut));
        }
    }
    return out;
}

// Helper struct that returns an object { type: "", vertices: [...], indices: [...]}:
// - type is the geom type
// - vertices is an array of THREE.Vector3
// - indices is optional, and are currently only used for polygons
// Multi-* geometry types are merged in one.
const GeometryToVertices = {
    point(crsIn, crsOut, coordinates, filteringExtent) {
        const coords = readCoordinates(crsIn, crsOut, coordinates);
        const vertices = [];
        for (const c of coords) {
            if (filteringExtent && filteringExtent.isPointInside(c)) {
                vertices.push(c.xyz());
            }
        }
        return { type: 'point', vertices };
    },

    polygon(crsIn, crsOut, coordinates, filteringExtent) {
        const contour = readCoordinates(crsIn, crsOut, coordinates[0]);

        if (filteringExtent && !filteringExtent.isPointInside(contour[0])) {
            return;
        }
        const vertices2 = [];
        const vertices = new Array(3 * contour.length);
        let offset = 0;
        for (const vertex of contour) {
            const v = vertex.xyz();
            v.toArray(vertices, offset);
            vertices2.push(v);
            offset += 3;
        }

        const triangles = Earcut(vertices, null, 3);
        // TODO: handle holes

        return { type: 'polygon', vertices: vertices2, indices: triangles };
    },

    lineString(crsIn, crsOut, coordinates, filteringExtent) {
        const coords = readCoordinates(crsIn, crsOut, coordinates);
        if (filteringExtent && !filteringExtent.isPointInside(coords[0])) {
            return;
        }

        const vertices = [];
        for (const c of coords) {
            vertices.push(c.xyz());
        }
        const indices = [];
        for (let i = 0; i < coords.length - 1; i++) {
            indices.push(i);
            indices.push(i + 1);
        }

        return { type: 'linestring', vertices, indices };
    },

    merge(...geoms) {
        let result;
        let offset = 0;
        for (const geom of geoms) {
            if (!geom) {
                continue;
            }
            if (!result) {
                result = geom;
                result.featureVertices = {};
            } else {
                // merge vertices
                result.vertices = result.vertices.concat(geom.vertices);
                if (result.indices) {
                    // merge indices if present
                    for (let i = 0; i < geom.indices.length; i++) {
                        result.indices.push(offset + geom.indices[i]);
                    }
                }
            }
            result.featureVertices[geom.featureIndex || 0] = { offset, count: geom.vertices.length };
            offset = result.vertices.length;
        }
        return result;
    },

    multiLineString(crsIn, crsOut, coordinates, filteringExtent) {
        let result;
        for (const line of coordinates) {
            const l = this.lineString(crsIn, crsOut, line, filteringExtent);
            if (!l) {
                return;
            }
            // only test the first line
            filteringExtent = undefined;
            result = this.merge(result, l);
        }
        return result;
    },

    multiPolygon(crsIn, crsOut, coordinates, filteringExtent) {
        let result;
        for (const polygon of coordinates) {
            const p = this.polygon(crsIn, crsOut, polygon, filteringExtent);
            if (!p) {
                return;
            }
            // only test the first poly
            filteringExtent = undefined;
            result = this.merge(result, p);
        }
        return result;
    },
};

function readGeometry(crsIn, crsOut, json, filteringExtent) {
    switch (json.type.toLowerCase()) {
        case 'point':
            return GeometryToVertices.point(crsIn, crsOut, [json.coordinates], filteringExtent);
        case 'multipoint':
            return GeometryToVertices.point(crsIn, crsOut, json.coordinates, filteringExtent);
        case 'linestring':
            return GeometryToVertices.lineString(crsIn, crsOut, json.coordinates, filteringExtent);
        case 'multilinestring':
            return GeometryToVertices.multiLineString(crsIn, crsOut, json.coordinates, filteringExtent);
        case 'polygon':
            return GeometryToVertices.polygon(crsIn, crsOut, json.coordinates, filteringExtent);
        case 'multipolygon':
            return GeometryToVertices.multiPolygon(crsIn, crsOut, json.coordinates, filteringExtent);
        case 'geometrycollection':
        default:
            throw new Error(`Unhandled geometry type ${json.type}`);
    }
}

function readFeature(crsIn, crsOut, json, filteringExtent) {
    const feature = {};
    feature.geometry = readGeometry(crsIn, crsOut, json.geometry, filteringExtent);

    if (!feature.geometry) {
        return;
    }
    feature.properties = {};
    // copy other properties
    for (const key of Object.keys(json)) {
        if (['type', 'geometry'].indexOf(key.toLowerCase()) < 0) {
            feature.properties[key] = json[key];
        }
    }

    return feature;
}

function verticesToMesh(vertices_and_indices) {
    if (!vertices_and_indices) {
        return;
    }

    // create geometry
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array(3 * vertices_and_indices.vertices.length);
    let offset = 0;
    for (let i = 0; i < vertices_and_indices.vertices.length; i++) {
        vertices_and_indices.vertices[i].toArray(vertices, offset);
        offset += 3;
    }

    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(vertices_and_indices.indices), 1));

    // instanciate mesh
    let result;
    switch (vertices_and_indices.type) {
        case 'point':
            result = new THREE.Points(geometry);
            break;
        case 'linestring':
            result = new THREE.LineSegments(geometry);
            break;
        case 'polygon':
        default:
            result = new THREE.Mesh(geometry);
            result.material.side = THREE.DoubleSide;
            break;
    }

    result.featureVertices = vertices_and_indices.featureVertices;

    return result;
}

function featureToThree(feature) {
    const mesh = verticesToMesh(feature.geometry);
    mesh.properties = feature.properties;
    return mesh;
}

function readFeatureCollection(crsIn, crsOut, json, filteringExtent) {
    const collec = [];

    let featureIndex = 0;
    for (const feature of json.features) {
        const f = readFeature(crsIn, crsOut, feature, filteringExtent);
        if (f) {
            f.geometry.featureIndex = featureIndex;
            collec.push(f);
            featureIndex++;
        }
    }
    if (collec.length) {
        // sort by types
        const geom = {
            points: collec.filter(c => c.geometry.type === 'point'),
            lines: collec.filter(c => c.geometry.type === 'linestring'),
            polygons: collec.filter(c => c.geometry.type === 'polygon'),
        };

        const result = new THREE.Group();
        if (geom.points.length) {
            const idx = result.children.length;
            geom.points.forEach((f, index) => { f.properties._idx = index; f.properties._meshIdx = idx; });
            const g = geom.points.map(p => p.geometry);
            const p = GeometryToVertices.merge(...g);
            result.add(verticesToMesh(p));
        }
        if (geom.lines.length) {
            const idx = result.children.length;
            geom.lines.forEach((f, index) => { f.properties._idx = index; f.properties._meshIdx = idx; });
            const g = geom.lines.map(p => p.geometry);
            const p = GeometryToVertices.merge(...g);
            result.add(verticesToMesh(p));
        }
        if (geom.polygons.length) {
            const idx = result.children.length;
            geom.polygons.forEach((f, index) => { f.properties._idx = index; f.properties._meshIdx = idx; });
            const g = geom.polygons.map(p => p.geometry);
            const p = GeometryToVertices.merge(...g);
            result.add(verticesToMesh(p));
        }
        // remember individual features properties
        // eslint-disable-next-line arrow-body-style
        result.features = collec.map((c) => { return { properties: c.properties }; });
        if (result.children.length) {
            return result;
        }
    }
}

export default {
    parse(crsOut, json, filteringExtent) {
        const crsIn = readCRS(json);
        switch (json.type.toLowerCase()) {
            case 'featurecollection':
                return readFeatureCollection(crsIn, crsOut, json, filteringExtent);
            case 'feature':
                return featureToThree(readFeature(crsIn, crsOut, json, filteringExtent));
            default:
                throw new Error(`Unsupported GeoJSON type: '${json.type}`);
        }
    },
};
