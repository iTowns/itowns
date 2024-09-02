import Coordinates from 'Core/Geographic/Coordinates';
import { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import { deprecatedParsingOptionsToNewOne } from 'Core/Deprecated/Undeprecator';

function readCRS(json) {
    if (json.crs) {
        if (json.crs.type.toLowerCase() == 'epsg') {
            return `EPSG:${json.crs.properties.code}`;
        } else if (json.crs.type.toLowerCase() == 'name') {
            if (json.crs.properties.name.toLowerCase().includes('epsg:')) {
                // OGC CRS URN: urn:ogc:def:crs:authority:version:code => EPSG:[...]:code
                // legacy identifier: authority:code => EPSG:code
                const codeStart = json.crs.properties.name.lastIndexOf(':');
                if (codeStart > 0) {
                    return `EPSG:${json.crs.properties.name.substr(codeStart + 1)}`;
                }
            }
            throw new Error(`Unsupported CRS authority '${json.crs.properties.name}'`);
        }
        throw new Error(`Unsupported CRS type '${json.crs}'`);
    }
    // assume default crs
    return 'EPSG:4326';
}

const coord = new Coordinates('EPSG:4978', 0, 0, 0);
const last = new Coordinates('EPSG:4978', 0, 0, 0);
const first = new Coordinates('EPSG:4978', 0, 0, 0);

// filter with the first point
const firstPtIsOut = (extent, aCoords, crs) => {
    coord.crs = crs;
    coord.setFromArray(aCoords[0]);
    return !extent.isPointInside(coord);
};
const toFeature = {
    populateGeometry(crsIn, coordinates, geometry, feature) {
        geometry.startSubGeometry(coordinates.length, feature);
        coord.crs = crsIn;
        // coordinates is a list of pair [[x1, y1], [x2, y2], ..., [xn, yn]]
        // or list of triplet [[x1, y1, z1], [x2, y2, z2], ..., [xn, yn, zn]]
        for (const triplet of coordinates) {
            coord.setFromValues(triplet[0], triplet[1], triplet[2]);
            geometry.pushCoordinates(feature, coord);
        }
        geometry.updateExtent();
    },
    // compute clockwise polygon
    populateGeometryWithCCW(crsIn, coordinates, geometry, feature) {
        geometry.startSubGeometry(coordinates.length, feature);
        coord.crs = crsIn;

        let sum = 0;
        first.setFromValues(coordinates[0][0], coordinates[0][1], coordinates[0][2]);
        last.copy(first);
        for (let i = 0; i < coordinates.length; i++) {
            coord.setFromValues(coordinates[i][0], coordinates[i][1], coordinates[i][2]);
            sum += (last.x - coord.x) * (last.y + coord.y);
            last.copy(coord);
            geometry.pushCoordinates(feature, coord);
        }
        sum += (last.x - first.x) * (last.y + first.y);
        geometry.getLastSubGeometry().ccw = sum < 0;
        geometry.updateExtent();
    },
    point(feature, crsIn, coordsIn, collection, properties) {
        this.default(feature, crsIn, [coordsIn], collection, properties);
    },
    default(feature, crsIn, coordsIn, collection, properties) {
        if (collection.filterExtent && firstPtIsOut(collection.filterExtent, coordsIn, crsIn)) {
            return;
        }

        const geometry = feature.bindNewGeometry();
        geometry.properties = properties;

        this.populateGeometry(crsIn, coordsIn, geometry, feature);
        feature.updateExtent(geometry);
    },
    polygon(feature, crsIn, coordsIn, collection, properties) {
        // filtering
        if (collection.filterExtent && firstPtIsOut(collection.filterExtent, coordsIn[0], crsIn)) {
            return;
        }
        const geometry = feature.bindNewGeometry();
        geometry.properties = properties;

        // Then read contour and holes
        for (let i = 0; i < coordsIn.length; i++) {
            this.populateGeometryWithCCW(crsIn, coordsIn[i], geometry, feature);
        }
        feature.updateExtent(geometry);
    },
    multi(type, feature, crsIn, coordsIn, collection, properties) {
        for (const coords of coordsIn) {
            this[type](feature, crsIn, coords, collection, properties);
        }
    },
};

function coordinatesToFeature(type, feature, crsIn, coordinates, collection, properties) {
    if (coordinates.length == 0) {
        return;
    }
    switch (type) {
        case 'point':
        case 'linestring':
            return toFeature.default(feature, crsIn, coordinates, collection, properties);
        case 'multipoint':
            return toFeature.multi('point', feature, crsIn, coordinates, collection, properties);
        case 'multilinestring':
            return toFeature.multi('default', feature, crsIn, coordinates, collection, properties);
        case 'polygon':
            return toFeature.polygon(feature, crsIn, coordinates, collection, properties);
        case 'multipolygon':
            return toFeature.multi('polygon', feature, crsIn, coordinates, collection, properties);
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

const firstCoordinates = a => (a === undefined || (Array.isArray(a) && !isNaN(a[0])) ? a : firstCoordinates(a[0]));

function jsonFeatureToFeature(crsIn, json, collection) {
    if (!json.geometry?.type) {
        console.warn('No geometry provided');
        return null;
    }

    const jsonType = json.geometry.type.toLowerCase();
    const featureType = toFeatureType(jsonType);
    const feature = collection.requestFeatureByType(featureType);
    const coordinates = jsonType != 'point' ? json.geometry.coordinates : [json.geometry.coordinates];
    const properties = json.properties || {};
    feature.hasRawElevationData = firstCoordinates(coordinates)?.length === 3;

    // copy other properties
    for (const key of Object.keys(json)) {
        if (!keyProperties.includes(key.toLowerCase())) {
            // create `geojson` key if it does not exist yet
            properties.geojson = properties.geojson || {};
            // add key defined property to `geojson` property
            properties.geojson[key] = json[key];
        }
    }

    coordinatesToFeature(jsonType, feature, crsIn, coordinates, collection, properties);

    return feature;
}

function jsonFeaturesToFeatures(crsIn, jsonFeatures, options) {
    const collection = new FeatureCollection(options);

    const filter = options.filter || (() => true);

    for (const jsonFeature of jsonFeatures) {
        if (filter(jsonFeature.properties, jsonFeature.geometry)) {
            jsonFeatureToFeature(crsIn, jsonFeature, collection);
        }
    }

    collection.removeEmptyFeature();
    collection.updateExtent();

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
     * Parse a GeoJSON file content and return a {@link FeatureCollection}.
     *
     * @param {string} json - The GeoJSON file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.

     * @return {Promise} A promise resolving with a {@link FeatureCollection}.
     */
    parse(json, options = {}) {
        options = deprecatedParsingOptionsToNewOne(options);
        options.in = options.in || {};

        const out = options.out;
        const _in = options.in;

        if (typeof (json) === 'string') {
            json = JSON.parse(json);
        }

        _in.crs = _in.crs || readCRS(json);

        if (out.filteringExtent) {
            if (typeof out.filteringExtent == 'boolean') {
                out.filterExtent = options.extent.isExtent ?
                    options.extent.as(_in.crs) :
                    options.extent.toExtent(_in.crs);
            } else if (out.filteringExtent.isExtent) {
                out.filterExtent = out.filteringExtent;
            }
        }

        switch (json.type.toLowerCase()) {
            case 'featurecollection':
                return Promise.resolve(jsonFeaturesToFeatures(_in.crs, json.features, out));
            case 'feature':
                return Promise.resolve(jsonFeaturesToFeatures(_in.crs, [json], out));
            default:
                throw new Error(`Unsupported GeoJSON type: '${json.type}`);
        }
    },
};
