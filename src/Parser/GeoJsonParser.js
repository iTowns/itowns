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

function setPropertiesStyle(type, properties) {
    const style = {};
    // console.log(properties);
    if (type === FEATURE_TYPES.POINT) {
        const point = {
            ...(properties.fill !== undefined && { color: properties.fill }),
            ...(properties['fill-opacity'] !== undefined && { opacity: properties['fill-opacity'] }),
            ...(properties.stroke !== undefined && { line: properties.stroke }),
            ...(properties.radius !== undefined && { radius: properties.radius }),
        };
        if (Object.keys(point).length) {
            style.point = point;
        }
        const text = {
            ...(properties['label-color'] !== undefined && { color: properties['label-color'] }),
            ...(properties['label-opacity'] !== undefined && { opacity: properties['label-opacity'] }),
            ...(properties['label-size'] !== undefined && { size: properties['label-size'] }),
        };
        if (Object.keys(point).length) {
            style.text = text;
        }
        const icon = {
            ...(properties.icon !== undefined && { source: properties.icon }),
            ...(properties['icon-scale'] !== undefined && { size: properties['icon-scale'] }),
            ...(properties['icon-opacity'] !== undefined && { opacity: properties['icon-opacity'] }),
            ...(properties['icon-color'] !== undefined && { color: properties['icon-color'] }),
        };
        if (Object.keys(icon).length) {
            style.icon = icon;
        }
        // if (properties.icon) {
        //     style.icon = { source: properties.icon };
        // }
    } else {
        const stroke = {
            ...(properties.stroke !== undefined && { color: properties.stroke }),
            ...(properties['stroke-width'] !== undefined && { width: properties['stroke-width'] }),
            ...(properties['stroke-opacity'] !== undefined && { opacity: properties['stroke-opacity'] }),
        };
        if (Object.keys(stroke).length) {
            style.stroke = stroke;
        }
        if (type !== FEATURE_TYPES.LINE) {
            const fill = {
                ...(properties.fill !== undefined && { color: properties.fill }),
                ...(properties['fill-opacity'] !== undefined && { opacity: properties['fill-opacity'] }),
            };
            if (Object.keys(fill).length) {
                style.fill = fill;
            }
        }
    }
    if (Object.keys(style).length) {
        properties.style = style;
    }
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
            geometry.pushCoordinates(coord, feature);
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
        for (var i = 0; i < coordinates.length; i++) {
            coord.setFromValues(coordinates[i][0], coordinates[i][1], coordinates[i][2]);
            sum += (last.x - coord.x) * (last.y + coord.y);
            last.copy(coord);
            geometry.pushCoordinates(coord, feature);
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
        // TODO !! FT GC
        // New Style() is not necessary as style can be replaced by feature.style + context.properties
        // geometry.properties.style = new Style({}, feature.style).setFromGeojsonProperties(properties, feature.type);
        setPropertiesStyle(feature.type, geometry.properties);

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
        // TODO !! FT GC
        // New Style() is not necessary as style can be replaced by feature.style.drawingStylefromContext(context.properties)
        // geometry.properties.style = new Style({}, feature.style).setFromGeojsonProperties(properties, feature.type);
        setPropertiesStyle(feature.type, geometry.properties);

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

function jsonFeatureToFeature(crsIn, json, collection) {
    const jsonType = json.geometry.type.toLowerCase();
    const featureType = toFeatureType(jsonType);
    const feature = collection.requestFeatureByType(featureType);
    const coordinates = jsonType != 'point' ? json.geometry.coordinates : [json.geometry.coordinates];
    const properties = json.properties || {};

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
     * Parse a GeoJSON file content and return a [FeatureCollection]{@link FeatureCollection}.
     *
     * @param {string} json - The GeoJSON file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.

     * @return {Promise} A promise resolving with a [FeatureCollection]{@link FeatureCollection}.
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
                out.filterExtent = json.extent.as(_in.crs);
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
