import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Coordinates from 'Core/Geographic/Coordinates';

// This part is freely adapted from vector-tile-js
// https://github.com/mapbox/vector-tile-js/blob/master/lib/vectortilefeature.js
function signedArea(ring) {
    let sum = 0;
    for (let i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2.x - p1.x) * (p1.y + p2.y);
    }
    return sum;
}

function classifyRings(rings) {
    const len = rings.length;

    if (len <= 1) { return [rings]; }

    const polygons = [];
    let polygon;
    let ccw;

    for (var i = 0; i < len; i++) {
        var area = signedArea(rings[i]);
        if (area === 0) { continue; }

        if (ccw === undefined) { ccw = area < 0; }

        if (ccw === area < 0) {
            if (polygon) { polygons.push(polygon); }
            polygon = [rings[i]];
        } else {
            polygon.push(rings[i]);
        }
    }
    if (polygon) { polygons.push(polygon); }

    return polygons;
}

const VectorTileFeature = { types: ['Unknown', 'Point', 'LineString', 'Polygon'] };
// EPSG:3857
// WGS84 bounds [-180.0, -85.06, 180.0, 85.06] (https://epsg.io/3857)
const coord = new Coordinates('EPSG:4326', 180, 85.06);
coord.as('EPSG:3857', coord);
// Get bound dimension in 'EPSG:3857'
const sizeX = coord._values[0] * 2;
const sizeY = coord._values[1] * 2;

function project(line, ox, oy, size) {
    for (let j = 0; j < line.length; j++) {
        const p = line[j];
        line[j] = [((p.x + ox) / size - 0.5) * sizeX, (0.5 - (p.y + oy) / size) * sizeY];
    }
}

function toGeoJSON(x, y, z) {
    const size = this.extent * 2 ** z;
    const x0 = this.extent * x;
    const y0 = this.extent * y;
    let coords = this.loadGeometry();
    let type = VectorTileFeature.types[this.type];


    switch (this.type) {
        case 1:
            var points = [];
            for (let i = 0; i < coords.length; i++) {
                points[i] = coords[i][0];
            }
            coords = points;
            project(coords, x0, y0, size);
            break;

        case 2:
            for (let i = 0; i < coords.length; i++) {
                project(coords[i], x0, y0, size);
            }
            break;

        case 3:
            coords = classifyRings(coords);
            for (let i = 0; i < coords.length; i++) {
                for (let j = 0; j < coords[i].length; j++) {
                    project(coords[i][j], x0, y0, size);
                }
            }
            break;
        default:
    }

    if (coords.length === 1) {
        coords = coords[0];
    } else {
        type = `Multi${type}`;
    }

    const result = {
        type: 'Feature',
        geometry: {
            type,
            coordinates: coords,
        },
        properties: this.properties,
    };

    if ('id' in this) {
        result.id = this.id;
    }

    return result;
}


function readPBF(file, options) {
    const vectorTile = new VectorTile(new Protobuf(file));
    const extentSource = options.extentSource || file.coords;
    const layers = Object.keys(vectorTile.layers);

    if (layers.length < 1) { return; }

    const crsInId = Number(options.crsIn.slice(5));

    // We need to create a featureCollection as VectorTile does no support it
    const geojson = {
        type: 'FeatureCollection',
        features: [],
        crs: { type: 'EPSG', properties: { code: crsInId } },
    };

    layers.forEach((layer_id) => {
        const l = vectorTile.layers[layer_id];

        for (let i = 0; i < l.length; i++) {
            let feature;
            // We need to move from TMS to Google/Bing/OSM coordinates
            // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
            // Only if the layer.origin is top
            if (options.isInverted) {
                feature = toGeoJSON.bind(l.feature(i))(extentSource.col, extentSource.row, extentSource.zoom);
            } else {
                const y = 1 << extentSource.zoom;
                feature = toGeoJSON.bind(l.feature(i))(extentSource.col, y - extentSource.row - 1, extentSource.zoom);
            }
            if (layers.length > 1) {
                feature.properties.vt_layer = layer_id;
            }

            geojson.features.push(feature);
        }
    });

    return GeoJsonParser.parse(geojson, {
        crsIn: options.crsIn,
        crsOut: options.crsOut,
        filteringExtent: options.filteringExtent,
        filter: options.filter,
        withNormal: options.withNormal,
        withAltitude: options.withAltitude,
        mergeFeatures: options.mergeFeatures,
        buildExtent: true,
    }).then((f) => {
        f.extent.zoom = extentSource.zoom;
        return f;
    });
}

/**
 * @module VectorTileParser
 */
export default {
    /**
     * Parse a vector tile file and return a [Feature]{@link module:GeoJsonParser.Feature}
     * or an array of Features. While multiple formats of vector tile are
     * available, the only one supported for the moment is the
     * [Mapbox Vector Tile]{@link https://www.mapbox.com/vector-tiles/specification/}.
     *
     * @param {ArrayBuffer} file - The vector tile file to parse.
     * @param {Object} options - Options controlling the parsing.
     * @param {Extent} options.extent - The Extent to convert the input coordinates to.
     * @param {Extent} options.coords - Coordinates of the layer.
     * @param {Extent=} options.filteringExtent - Optional filter to reject features
     * outside of this extent.
     * @param {boolean} [options.mergeFeatures=true] - If true all geometries are merged by type and multi-type
     * @param {boolean} [options.withNormal=true] - If true each coordinate normal is computed
     * @param {boolean} [options.withAltitude=true] - If true each coordinate altitude is kept
     * @param {function=} options.filter - Filter function to remove features.
     * @param {string=} options.isInverted - This option is to be set to the
     * correct value, true or false (default being false), if the computation of
     * the coordinates needs to be inverted to same scheme as OSM, Google Maps
     * or other system. See [this link]{@link
     * https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates}
     * for more informations.
     *
     * @return {Promise} A Promise resolving with a Feature or an array a
     * Features.
     */
    parse(file, options) {
        return Promise.resolve(readPBF(file, options));
    },
};
