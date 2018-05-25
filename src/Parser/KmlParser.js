import togeojson from 'togeojson';
import GeoJsonParser from './GeoJsonParser';

/**
 * The KmlParser module provides a [parse]{@link module:KmlParser.parse} method
 * that takes a KML in and gives an object formatted for iTowns containing all
 * necessary informations to display this KML.
 *
 * @module KmlParser
 * @implements Parser
 */
export default {
    /**
     * Parse a KML file consent and return a [Feature]{@link
     * module:GeoJsonParser~Feature} or an array of Features.
     *
     * @param {string} xml - The KML file content to parse.
     * @param {Object} [options] - Options controlling the parsing.
     * @param {string} options.crsOut - The CRS to convert the input coordinates
     * to.
     * @param {string} options.crsIn - Override the data CRS.
     * @param {Extent} [options.filteringExtent] - Optional filter to reject
     * features outside of this extent.
     * @param {boolean} [options.buildExtent=false] - If true the geometry will
     * have an extent property containing the area covered by the geom
     * @param {function} [options.filter] - Filter function to remove features
     *
     * @return {Promise} A promise resolving with a [Feature]{@link
     * module:GeoJsonParser~Feature} or an array of Features.
     */
    parse(xml, options = {}) {
        if (!(xml instanceof XMLDocument)) {
            xml = new window.DOMParser().parseFromString(xml, 'text/xml');
        }

        return GeoJsonParser.parse(togeojson.kml(xml), options);
    },
};
