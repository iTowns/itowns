import { kml } from '@tmcw/togeojson';
import GeoJsonParser from 'Parser/GeoJsonParser';

/**
 * The KMLParser module provides a [parse]{@link module:KMLParser.parse}
 * method that takes a KML in and gives an object formatted for iTowns
 * containing all necessary informations to display this KML.
 *
 * @module KMLParser
 */
export default {
    /**
     * Parse a KML file content and return a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     *
     * @param {XMLDocument} kmlFile - The KML file content to parse.
     * @param {GeoJsonParser~GeoJsonParserOptions} options - Options controlling the parsing.
     *
     * @return {Promise} A promise resolving with a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     */
    parse(kmlFile, options) {
        return GeoJsonParser.parse(kml(kmlFile), options);
    },
};
