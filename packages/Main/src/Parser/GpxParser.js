import { gpx } from '@tmcw/togeojson';
import GeoJsonParser from 'Parser/GeoJsonParser';
import { deprecatedParsingOptionsToNewOne } from 'Core/Deprecated/Undeprecator';

/**
 * The GpxParser module provides a `parse`
 * method that takes a GPX in and gives an object formatted for iTowns
 * containing all necessary informations to display this GPX.
 *
 * @category Parser
 */
export default {
    /**
     * Parse a GPX file content and return a `FeatureCollection`.
     *
     * @param {XMLDocument} gpxFile - The GPX file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.
     *
     * @returns {Promise} A promise resolving with a `FeatureCollection`.
     */
    parse(gpxFile, options) {
        options = deprecatedParsingOptionsToNewOne(options);
        return GeoJsonParser.parse(gpx(gpxFile), options);
    },
};
