import { kml } from '@tmcw/togeojson';
import GeoJsonParser from 'Parser/GeoJsonParser';
import { deprecatedParsingOptionsToNewOne } from 'Core/Deprecated/Undeprecator';

/**
 * The KMLParser module provides a [parse]{@link module:KMLParser.parse}
 * method that takes a KML in and gives an object formatted for iTowns
 * containing all necessary informations to display this KML.
 *
 * @module KMLParser
 */
export default {
    // eslint-disable-next-line valid-jsdoc
    /**
     * Parse a KML file content and return a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     *
     * @param {XMLDocument} kmlFile - The KML file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.
     *
     * @return {Promise} A promise resolving with a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     */
    parse(kmlFile, options, DOMParser = window.DOMParser) {
        options = deprecatedParsingOptionsToNewOne(options);
        const xmlDom = new DOMParser().parseFromString(kmlFile, 'text/xml');
        return GeoJsonParser.parse(kml(xmlDom), options);
    },
};
