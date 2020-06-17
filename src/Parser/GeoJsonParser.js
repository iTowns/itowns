import Coordinates from 'Core/Geographic/Coordinates';
import Feature, { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import Style from '../Core/Style';

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

const coord = new Coordinates('EPSG:4978', 0, 0, 0);
// filter with the first point
const firstPtIsOut = (extent, aCoords, crs) => {
    coord.crs = crs;
    coord.setFromArray(aCoords[0]);
    return !extent.isPointInside(coord);
};
const toFeature = {
    populateGeometry(crsIn, coordinates, geometry, setAltitude = true, feature) {
        geometry.startSubGeometry(coordinates.length, feature);
        const useAlti = setAltitude && typeof coordinates[0][2] == 'number';

        // coordinates is a list of pair [[x1, y1], [x2, y2], ..., [xn, yn]]
        for (const pair of coordinates) {
            coord.crs = crsIn;
            coord.setFromValues(pair[0], pair[1], useAlti ? pair[2] : 0);
            geometry.pushCoordinates(coord, feature);
        }
        geometry.updateExtent();
    },
    point(feature, crsIn, coordsIn, filteringExtent, setAltitude, properties) {
        this.default(feature, crsIn, [coordsIn], filteringExtent, setAltitude, properties);
    },
    default(feature, crsIn, coordsIn, filteringExtent, setAltitude, properties) {
        if (filteringExtent && firstPtIsOut(filteringExtent, coordsIn, crsIn)) {
            return;
        }

        const geometry = feature.bindNewGeometry();
        geometry.properties = properties;
        geometry.properties.style = new Style().setFromGeojsonProperties(properties, feature.type);
        this.populateGeometry(crsIn, coordsIn, geometry, setAltitude, feature);
        feature.updateExtent(geometry);
    },
    polygon(feature, crsIn, coordsIn, filteringExtent, setAltitude, properties) {
        // filtering
        if (filteringExtent && firstPtIsOut(filteringExtent, coordsIn[0], crsIn)) {
            return;
        }
        const geometry = feature.bindNewGeometry();
        geometry.properties = properties;
        geometry.properties.style = new Style().setFromGeojsonProperties(properties, feature.type);

        // Then read contour and holes
        for (let i = 0; i < coordsIn.length; i++) {
            this.populateGeometry(crsIn, coordsIn[i], geometry, setAltitude, feature);
        }
        feature.updateExtent(geometry);
    },
    multi(type, feature, crsIn, coordsIn, filteringExtent, setAltitude, properties) {
        for (const coords of coordsIn) {
            this[type](feature, crsIn, coords, filteringExtent, setAltitude, properties);
        }
    },
};

function coordinatesToFeature(type, feature, crsIn, coordinates, filteringExtent, setAltitude, properties) {
    if (coordinates.length == 0) {
        return;
    }
    switch (type) {
        case 'point':
        case 'linestring':
            return toFeature.default(feature, crsIn, coordinates, filteringExtent, setAltitude, properties);
        case 'multipoint':
            return toFeature.multi('point', feature, crsIn, coordinates, filteringExtent, setAltitude, properties);
        case 'multilinestring':
            return toFeature.multi('default', feature, crsIn, coordinates, filteringExtent, setAltitude, properties);
        case 'polygon':
            return toFeature.polygon(feature, crsIn, coordinates, filteringExtent, setAltitude, properties);
        case 'multipolygon':
            return toFeature.multi('polygon', feature, crsIn, coordinates, filteringExtent, setAltitude, properties);
        case 'geometrycollection':
        default:
            throw new Error(`Unhandled geojson type ${feature.type}`);
    }
}

function toFeatureType(jsonType) {
    switch (jsonType) {
        case 'point':
        case 'multipoint':
            return FEATURE_TYPES.POINT;
        case 'linestring':
        case 'multilinestring':
            return FEATURE_TYPES.LINE;
        case 'polygon':
        case 'multipolygon':
            return FEATURE_TYPES.POLYGON;
        case 'geometrycollection':
        default:
            throw new Error(`Unhandled geometry type ${jsonType}`);
    }
}

const keyProperties = ['type', 'geometry', 'properties'];

function jsonFeatureToFeature(crsIn, crsOut, json, filteringExtent, options, collection) {
    if (options.filter && !options.filter(json.properties, json.geometry)) {
        return;
    }

    const jsonType = json.geometry.type.toLowerCase();
    const featureType = toFeatureType(jsonType);
    const feature = options.mergeFeatures ? collection.requestFeatureByType(featureType) : new Feature(featureType, crsOut, options);
    const geometryCount = feature.geometryCount;
    const coordinates = jsonType != 'point' ? json.geometry.coordinates : [json.geometry.coordinates];
    const setAltitude = !options.overrideAltitudeInToZero && options.withAltitude;
    const properties = json.properties || {};

    // copy other properties
    for (const key of Object.keys(json)) {
        if (!keyProperties.includes(key.toLowerCase())) {
            properties[key] = json[key];
        }
    }

    coordinatesToFeature(jsonType, feature, crsIn, coordinates, filteringExtent, setAltitude, properties);

    if (feature.geometryCount == geometryCount) {
        return;
    }

    return feature;
}

function jsonFeaturesToFeatures(crsIn, crsOut, jsonFeatures, filteringExtent, options) {
    const collection = new FeatureCollection(crsOut, options);

    for (const jsonFeature of jsonFeatures) {
        const feature = jsonFeatureToFeature(crsIn, crsOut, jsonFeature, filteringExtent, options, collection);
        if (feature && !options.mergeFeatures) {
            collection.pushFeature(feature);
        }
    }

    if (options.mergeFeatures) {
        collection.removeEmptyFeature();
        collection.updateExtent();
    }

    return collection;
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
     * @typedef {Object} GeoJsonParserOptions
     * @property {string} crsOut - The CRS to convert the input coordinates
     * to.
     * @property {string} crsIn - Override the data CRS.
     * @property {Extent} [filteringExtent] - Optional filter to reject
     * features outside of this extent.
     * @property {boolean} [buildExtent=false] - If true the geometry will
     * have an extent property containing the area covered by the geom
     * @property {function} [filter] - Filter function to remove features
     * @property {boolean} [mergeFeatures=true] - If true all geometries are merged by type and multi-type
     * @property {boolean} [withNormal=true] - If true each coordinate normal is computed
     * @property {boolean} [withAltitude=true] - If true each coordinate altitude is kept
     * @property {boolean} [overrideAltitudeInToZero=false] - If true, the altitude of the source data isn't taken into account for 3D geometry convertions.
     * the altitude will be override to 0. This can be useful if you don't have a DEM or provide a new one when converting (with Layer.convert).
     */

    /**
     * Parse a GeoJSON file content and return a [FeatureCollection]{@link FeatureCollection}.
     *
     * @param {string} json - The GeoJSON file content to parse.
     * @param {GeoJsonParser~GeoJsonParserOptions} options - Options controlling
     * the parsing.
     *
     * @return {Promise} A promise resolving with a [FeatureCollection]{@link FeatureCollection}.
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
                return Promise.resolve(jsonFeaturesToFeatures(options.crsIn, crsOut, json.features, filteringExtent, options));
            case 'feature':
                return Promise.resolve(jsonFeaturesToFeatures(options.crsIn, crsOut, [json], filteringExtent, options));
            default:
                throw new Error(`Unsupported GeoJSON type: '${json.type}`);
        }
    },
};
