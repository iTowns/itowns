import Coordinates from '../Core/Geographic/Coordinates';
import Extent from '../Core/Geographic/Extent';

function applyOffset(indices, offset) {
    for (const indice of indices) {
        indice.offset += offset;
    }

    return indices;
}

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
    return 'EPSG:4326';
}

const coords = new Coordinates('EPSG:4978', 0, 0, 0);
function readCoordinates(crsIn, crsOut, coordinates, extent, target) {
    // coordinates is a list of pair [[x1, y1], [x2, y2], ..., [xn, yn]]
    let offset = 0;
    if (target) {
        offset = target.length;
        target.length += coordinates.length;
    }
    const out = target || new Array(coordinates.length);

    let i = 0;
    // TODO: 1 is a default z value, makes this configurable
    let z = 1;
    for (const pair of coordinates) {
        if (typeof pair[2] == 'number') {
            z = pair[2];
        }

        if (crsIn === crsOut) {
            out[offset + i] = new Coordinates(crsIn, pair[0], pair[1], z);
        } else {
            coords.set(crsIn, pair[0], pair[1], z);
            out[offset + i] = coords.as(crsOut);
        }
        // expand extent if present
        if (extent) {
            extent.expandByPoint(out[offset + i]);
        }
        ++i;
    }
    return out;
}

// Helper struct that returns an object { type: "", coordinates: [...], extent}:
// - type is the geom type
// - Coordinates is an array of Coordinate
// - extent is optional, it's coordinates's extent
// Multi-* geometry types are merged in one.
const GeometryToCoordinates = {
    point(feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        let coordinates = readCoordinates(crsIn, crsOut, coordsIn, extent);
        if (filteringExtent) {
            coordinates = coordinates.filter(c => filteringExtent.isPointInside(c));
        }

        feature.vertices = feature.vertices.concat(coordinates);
        feature.geometry.push({ extent });

        return feature;
    },
    polygon(feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        // read contour first
        const coordinates = readCoordinates(crsIn, crsOut, coordsIn[0], extent);
        if (filteringExtent && !filteringExtent.isPointInside(coordinates[0])) {
            return;
        }
        const indices = [{ offset: 0, count: coordinates.length }];
        let offset = coordinates.length;
        // Then read optional holes
        for (let i = 1; i < coordsIn.length; i++) {
            readCoordinates(crsIn, crsOut, coordsIn[i], extent, coordinates);
            const count = coordinates.length - offset;
            indices.push({ offset, count });
            offset += count;
        }

        feature.vertices = feature.vertices.concat(coordinates);
        feature.geometry.push({ extent, indices });

        return feature;
    },
    lineString(feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        const coordinates = readCoordinates(crsIn, crsOut, coordsIn, extent);
        if (filteringExtent && !filteringExtent.isPointInside(coordinates[0])) {
            return;
        }
        const indices = [{ offset: 0, count: coordinates.length }];

        feature.vertices = feature.vertices.concat(coordinates);
        feature.geometry.push({ extent, indices });

        return feature;
    },
    multi(type, feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        if (coordsIn.length == 1) {
            return this[type](feature, crsIn, crsOut, coordsIn[0], filteringExtent, options);
        }

        let globalOffset = 0;
        let indices;

        for (const coords of coordsIn) {
            if (this[type](feature, crsIn, crsOut, coords, filteringExtent, options)) {
                indices = feature.geometry[feature.geometry.length - 1].indices;
                applyOffset(indices, globalOffset);
                const lastIndice = indices[indices.length - 1];
                globalOffset = lastIndice.offset + lastIndice.count;
            }
        }

        return feature;
    },
};

function readGeometry(feature, crsIn, crsOut, geometry, filteringExtent, options) {
    if (geometry.length == 0) {
        return;
    }
    switch (feature.type) {
        case 'point':
            return GeometryToCoordinates.point(feature, crsIn, crsOut, [geometry], filteringExtent, options);
        case 'multipoint':
            return GeometryToCoordinates.multi('point', feature, crsIn, crsOut, geometry, filteringExtent, options);
        case 'linestring':
            return GeometryToCoordinates.lineString(feature, crsIn, crsOut, geometry, filteringExtent, options);
        case 'multilinestring':
            return GeometryToCoordinates.multi('lineString', feature, crsIn, crsOut, geometry, filteringExtent, options);
        case 'polygon':
            return GeometryToCoordinates.polygon(feature, crsIn, crsOut, geometry, filteringExtent, options);
        case 'multipolygon':
            return GeometryToCoordinates.multi('polygon', feature, crsIn, crsOut, geometry, filteringExtent, options);
        case 'geometrycollection':
        default:
            throw new Error(`Unhandled geometry type ${feature.type}`);
    }
}

function readFeature(crsIn, crsOut, json, filteringExtent, options) {
    if (options.filter && !options.filter(json.properties, json.geometry)) {
        return;
    }
    const feature = {
        type: json.geometry.type.toLowerCase(),
        geometry: [],
        vertices: [],
    };

    readGeometry(feature, crsIn, crsOut, json.geometry.coordinates, filteringExtent, options);

    if (feature.geometry.length == 0) {
        return;
    }

    if (options.buildExtent) {
        for (const g of feature.geometry) {
            feature.extent = feature.extent || g.extent;
            feature.extent.union(g.extent);
        }
    }

    feature.properties = json.properties || {};
    // copy other properties
    for (const key of Object.keys(json)) {
        if (['type', 'geometry', 'properties'].indexOf(key.toLowerCase()) < 0) {
            feature.properties[key] = json[key];
        }
    }

    return feature;
}

function readFeatures(crsIn, crsOut, features, filteringExtent, options) {
    const res = {
        features: [],
    };

    for (const feature of features) {
        const f = readFeature(crsIn, crsOut, feature, filteringExtent, options);
        if (f) {
            if (options.buildExtent) {
                if (res.extent) {
                    res.extent.union(f.extent);
                } else {
                    res.extent = f.extent.clone();
                }
            }
            res.features.push(f);
        }
    }
    return res;
}

/**
 * The GeoJsonParser module provide a [parse]{@link module:GeoJsonParser.parse}
 * method that takes a GeoJSON in and gives an object formatted for iTowns
 * containing all necessary informations to display this GeoJSON.
 *
 * @module GeoJsonParser
 */
export default {
    /**
     * Similar to the geometry of a feature in a GeoJSON, but adapted to iTowns.
     * The difference is that coordinates are stored as {@link Coordinates}
     * instead of raw values. If needed, more information is provided.
     *
     * @typedef FeatureGeometry
     * @type {Object}
     *
     * @property {Extent} extent - The 2D extent containing all the points
     * composing the geometry.
     * @property {?Object[]} indices - If this geometry is a
     * <code>linestring</code> or a <code>polygon</code>, contains the indices
     * that define the geometry. Objects stored in this array have two
     * properties, an <code>offset</code> and a <code>count</code>. The offset
     * is related to the overall number of vertices in the Feature.
     */

    /**
     * Similar to a feature in a GeoJSON, but adapted to iTowns.
     *
     * @typedef Feature
     * @type {Object}
     *
     * @property {string} type - Geometry type, can be <code>point</code>,
     * <code>multipoint</code>, <code>linestring</code>,
     * <code>multilinestring</code>, <code>polygon</code> or
     * <code>multipolygon</code>.
     * @property {Coordinates[]} vertices - All the vertices of the geometry.
     * @property {FeatureGeometry[]} geometry - The feature's geometry, as an
     * array of [FeatureGeometry]{@link module:GeoJsonParser~FeatureGeometry}.
     * @property {Object} properties - Properties of the features. It can be
     * anything specified in the GeoJSON under the <code>properties</code>
     * property.
     * @property {Extent?} extent - The 2D extent containing all the geometries
     * composing the feature.
     */

    /**
     * An object regrouping a list of [features]{@link
     * module:GeoJsonParser~Feature} and the extent of this collection.
     *
     * @typedef FeatureCollection
     * @type {Object}
     *
     * @property {Feature[]} features - The array of features composing the
     * collection.
     * @property {Extent?} extent - The 2D extent containing all the features
     * composing the collection.
     */

    /**
     * Parse a GeoJSON file content and return a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     *
     * @param {string} json - The GeoJSON file content to parse.
     * @param {Object} options - Options controlling the parsing.
     * @param {string} options.crsOut - The CRS to convert the input coordinates
     * to.
     * @param {string} options.crsIn - Override the data CRS.
     * @param {Extent} [options.filteringExtent] - Optional filter to reject
     * features outside of this extent.
     * @param {boolean} [options.buildExtent=false] - If true the geometry will
     * have an extent property containing the area covered by the geom
     * @param {function} [options.filter] - Filter function to remove features
     *
     * @return {Promise} A promise resolving with a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     */
    parse(json, options = {}) {
        const crsOut = options.crsOut;
        const filteringExtent = options.filteringExtent;
        if (typeof (json) === 'string') {
            json = JSON.parse(json);
        }
        options.crsIn = options.crsIn || readCRS(json);
        switch (json.type.toLowerCase()) {
            case 'featurecollection':
                return Promise.resolve(readFeatures(options.crsIn, crsOut, json.features, filteringExtent, options));
            case 'feature':
                return Promise.resolve(readFeatures(options.crsIn, crsOut, [json], filteringExtent, options));
            default:
                throw new Error(`Unsupported GeoJSON type: '${json.type}`);
        }
    },
};
