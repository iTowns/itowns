import { kml } from '@tmcw/togeojson';
import GeoJsonParser from 'Parser/GeoJsonParser';
import { deprecatedParsingOptionsToNewOne } from 'Core/Deprecated/Undeprecator';

/**
 * The KMLParser module provides a `parse`
 * method that takes a KML in and gives an object formatted for iTowns
 * containing all necessary informations to display this KML.
 *
 * @category Parser
 */
export default {
    /**
     * Parse a KML file content and return a `FeatureCollection`.
     *
     * @param {XMLDocument} kmlFile - The KML file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.
     *
     * @returns {Promise} A promise resolving with a `FeatureCollection`.
     */
    parse(kmlFile, options) {
        options = deprecatedParsingOptionsToNewOne(options);
        return GeoJsonParser.parse(kml(kmlFile), options);
    },
};
