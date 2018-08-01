import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import GeoJsonParser from './GeoJsonParser';

function readPBF(file, options) {
    const vectorTile = new VectorTile(new Protobuf(file));

    const layers = Object.keys(vectorTile.layers);

    if (layers.length < 1) return;

    // We need to create a featureCollection as VectorTile does no support it
    const geojson = {
        type: 'FeatureCollection',
        features: [],
        crs: { type: 'EPSG', properties: { code: 4326 } },
        extent: options.extent,
    };

    layers.forEach((layer_id) => {
        const l = vectorTile.layers[layer_id];

        for (let i = 0; i < l.length; i++) {
            let feature;
            // We need to move from TMS to Google/Bing/OSM coordinates
            // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
            // Only if the layer.origin is top
            if (options.origin == 'top') {
                feature = l.feature(i).toGeoJSON(options.coords.col, options.coords.row, options.coords.zoom);
            } else {
                const y = 1 << options.coords.zoom;
                feature = l.feature(i).toGeoJSON(options.coords.col, y - options.coords.row - 1, options.coords.zoom);
            }
            if (layers.length > 1) {
                feature.properties.vt_layer = layer_id;
            }

            geojson.features.push(feature);
        }
    });

    let crsOut;
    switch (options.coords.crs()) {
        case 'WMTS:PM':
            crsOut = 'EPSG:3857';
            break;
        default:
            crsOut = options.extent.crs();
    }

    return GeoJsonParser.parse(geojson, {
        crsOut,
        filteringExtent: options.filteringExtent,
        filter: options.filter,
        buildExtent: true,
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
     * @param {function=} options.filter - Filter function to remove features.
     * @param {string=} options.origin - This option is to be set to the correct
     * value, bottom or top (default being bottom), if the computation of the
     * coordinates needs to be inverted to same scheme as OSM, Google Maps or
     * other system. See [this link]{@link https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates} for more informations.
     *
     * @return {Promise} A Promise resolving with a Feature or an array a
     * Features.
     */
    parse(file, options) {
        return Promise.resolve(readPBF(file, options));
    },
};
