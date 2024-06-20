import { gpx } from '@tmcw/togeojson';
import GeoJsonParser from 'Parser/GeoJsonParser';
import { deprecatedParsingOptionsToNewOne } from 'Core/Deprecated/Undeprecator';

/**
 * The GpxParser module provides a [parse]{@link module:GpxParser.parse}
 * method that takes a GPX in and gives an object formatted for iTowns
 * containing all necessary informations to display this GPX.
 *
 * @module GpxParser
 */
export default {
    /**
     * Parse a GPX file content and return a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     *
     * @param {XMLDocument} gpxFile - The GPX file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.
     *
     * @return {Promise} A promise resolving with a [FeatureCollection]{@link
     * module:GeoJsonParser~FeatureCollection}.
     */
    parse(gpxFile, options) {
        options = deprecatedParsingOptionsToNewOne(options);
        return GeoJsonParser.parse(gpx(gpxFile), options);
    },
};
