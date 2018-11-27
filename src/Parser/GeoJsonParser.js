import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';

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

const coordIn = new Coordinates('EPSG:4978', 0, 0, 0);
const coordOut = new Coordinates('EPSG:4978', 0, 0, 0);
function readCoordinates(crsIn, crsOut, coordinates, extent, target, normals, size) {
    // coordinates is a list of pair [[x1, y1], [x2, y2], ..., [xn, yn]]
    let offset = 0;
    // let cIn = coordIn;
    let cOut = coordOut;
    if (target) {
        offset = target.length;
        const count = coordinates.length * size;
        target.length += count;
        if (normals) {
            normals.length += count;
        }
    }
    target = target || new Array(coordinates.length);
    let z = 0;
    for (const pair of coordinates) {
        if (size == 3 && typeof pair[2] == 'number') {
            z = pair[2];
        }

        coordIn.set(crsIn, pair[0], pair[1], z);
        if (crsIn !== crsOut) {
            coordIn.as(crsOut, coordOut);
        } else {
            cOut = coordIn;
        }
        if (normals) {
            cOut.geodesicNormal.toArray(normals, offset);
        }

        target[offset] = cOut._values[0];
        target[offset + 1] = cOut._values[1];
        if (size == 3) {
            target[offset + 2] = cOut._values[2];
        }

        // expand extent if present
        if (extent) {
            if (extent.crs() == crsIn) {
                extent.expandByPoint(coordIn);
            } else {
                extent.expandByPoint(cOut);
            }
        }
        offset += size;
    }
    return target;
}

// Helper struct that returns an object { type: "", coordinates: [...], extent}:
// - type is the geom type
// - Coordinates is an array of Coordinate
// - extent is optional, it's coordinates's extent
// Multi-* geometry types are merged in one.
const coords = new Coordinates('EPSG:4978', 0, 0, 0);
// filter with the first point
const firstPtIsOut = (extent, aCoords, crs) => {
    const first = aCoords[0];
    coords.set(crs, first[0], first[1], 0);
    return !extent.isPointInside(coords);
};
const GeometryToCoordinates = {
    point(feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        // filtering
        if (filteringExtent && firstPtIsOut(filteringExtent, coordsIn, crsIn)) {
            return;
        }

        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        const offset = feature.vertices.length / feature.size;
        readCoordinates(crsIn, crsOut, coordsIn, extent, feature.vertices, feature.normals, feature.size);

        feature.geometry.push({ extent, indices: [{ offset, count: 1 }] });
        return feature;
    },
    polygon(feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        // filtering
        if (filteringExtent && firstPtIsOut(filteringExtent, coordsIn[0], crsIn)) {
            return;
        }

        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        let offset = feature.vertices.length / feature.size;
        // read contour first
        readCoordinates(crsIn, crsOut, coordsIn[0], extent, feature.vertices, feature.normals, feature.size);

        const indices = [{ offset, count: coordsIn[0].length }];
        offset += coordsIn[0].length;
        // Then read optional holes
        for (let i = 1; i < coordsIn.length; i++) {
            readCoordinates(crsIn, crsOut, coordsIn[i], extent, feature.vertices, feature.normals, feature.size);
            const count = coordsIn[i].length;
            indices.push({ offset, count });
            offset += count;
        }

        feature.geometry.push({ extent, indices });
        return feature;
    },
    lineString(feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        // filtering
        if (filteringExtent && firstPtIsOut(filteringExtent, coordsIn, crsIn)) {
            return;
        }

        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        const offset = feature.vertices.length / feature.size;
        readCoordinates(crsIn, crsOut, coordsIn, extent, feature.vertices, feature.normals, feature.size);

        const indices = [{ offset, count: feature.vertices.length / feature.size - offset }];
        feature.geometry.push({ extent, indices });

        return feature;
    },
    multi(type, feature, crsIn, crsOut, coordsIn, filteringExtent, options) {
        for (const coords of coordsIn) {
            this[type](feature, crsIn, crsOut, coords, filteringExtent, options);
        }

        return feature;
    },
};

function readGeometry(type, feature, crsIn, crsOut, geometry, filteringExtent, options) {
    if (geometry.length == 0) {
        return;
    }
    switch (type) {
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

function mergeType(type) {
    switch (type) {
        case 'point':
        case 'multipoint':
            return 'multipoint';
        case 'linestring':
        case 'multilinestring':
            return 'multilinestring';
        case 'polygon':
        case 'multipolygon':
            return 'multipolygon';
        case 'geometrycollection':
        default:
            throw new Error(`Unhandled geometry type ${type}`);
    }
}

const keyProperties = ['type', 'geometry', 'properties'];
function readFeature(crsIn, crsOut, json, filteringExtent, options, featureMerge = {}) {
    if (options.filter && !options.filter(json.properties, json.geometry)) {
        return;
    }

    const jsonType = json.geometry.type.toLowerCase();
    const type = options.mergeFeatures ? mergeType(jsonType) : jsonType;

    const feature = featureMerge[type] || {
        type,
        geometry: [],
        vertices: [],
        normals: options.withNormal ? [] : undefined,
        crs: crsOut,
        size: options.withAltitude ? 3 : 2,
    };

    const offset = feature.geometry.length;
    readGeometry(jsonType, feature, crsIn, crsOut, json.geometry.coordinates, filteringExtent, options);

    if (feature.geometry.length == offset) {
        return;
    }

    const properties = json.properties || {};

    // copy other properties
    for (const key of Object.keys(json)) {
        if (!keyProperties.includes(key.toLowerCase())) {
            properties[key] = json[key];
        }
    }

    for (let i = offset; i < feature.geometry.length; i++) {
        const g = feature.geometry[i];
        if (options.buildExtent) {
            feature.extent = feature.extent || g.extent;
            feature.extent.union(g.extent);
        }
        g.properties = properties;
    }

    return feature;
}

const mergeExtent = (res, extent) => {
    if (res.extent) {
        res.extent.union(extent);
    } else {
        res.extent = extent.clone();
    }
};

const mergesType = ['multipolygon', 'multilinestring', 'multipoint'];
function readFeatures(crsIn, crsOut, features, filteringExtent, options) {
    const res = {
        features: [],
    };

    const featuresMerge = {};
    if (options.mergeFeatures) {
        for (const type of mergesType) {
            featuresMerge[type] = {
                type,
                geometry: [],
                vertices: [],
                normals: options.withNormal ? [] : undefined,
                crs: crsOut,
                size: options.withAltitude ? 3 : 2,
            };
        }
    }

    for (const feature of features) {
        const f = readFeature(crsIn, crsOut, feature, filteringExtent, options, featuresMerge);
        if (f && !options.mergeFeatures) {
            if (options.buildExtent) {
                mergeExtent(res, f.extent);
            }
            res.features.push(f);
        }
    }

    if (options.mergeFeatures) {
        for (const type of mergesType) {
            const f = featuresMerge[type];
            if (f.geometry.length) {
                f.vertices.crs = crsOut;
                res.features.push(f);
                if (options.buildExtent) {
                    mergeExtent(res, f.extent);
                }
            }
        }
    }

    res.crs = crsOut;
    res.isFeature = true;
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
     * The difference is that coordinates are stored in unique Array of number
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
     *
     * @property {Object} properties - Properties of the geometry. It can be
     * anything specified in the GeoJSON under the <code>properties</code>
     * property.
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
     * @property {number[]} vertices - All the vertices of the geometry.
     * @property {number[]} normals - All the normals of the geometry.
     * @property {number} size - the number of values of the array that should be associated with a coordinates.
     * The size is 3 with altitude and 2 without altitude.
     * @property {string} crs - Geographic or Geocentric coordinates system.
     * @property {FeatureGeometry[]} geometry - The feature's geometry, as an
     * array of [FeatureGeometry]{@link module:GeoJsonParser~FeatureGeometry}.
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
     * @property {string} crs - Geographic or Geocentric coordinates system.
     * @property {boolean} isFeature - Used to check whether this is FeatureCollection.
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
     * @param {boolean} [options.mergeFeatures=true] - If true all geometries are merged by type and multi-type
     * @param {boolean} [options.withNormal=true] - If true each coordinate normal is computed
     * @param {boolean} [options.withAltitude=true] - If true each coordinate altitude is kept
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
        options.mergeFeatures = options.mergeFeatures == undefined ? true : options.mergeFeatures;
        options.withNormal = options.withNormal == undefined ? true : options.withNormal;
        options.withAltitude = options.withAltitude == undefined ? true : options.withAltitude;

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
