import Source from 'Source/Source';
import URLBuilder from 'Provider/URLBuilder';
import Extent from 'Core/Geographic/Extent';
import CRS from 'Core/Geographic/Crs';

/**
 * @classdesc
 * An object defining the source of resources to get from a [TMS]{@link
 * https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification} server. It
 * inherits from {@link Source}.
 *
 * @extends Source
 *
 * @property {boolean} isTMSSource - Used to checkout whether this source is a
 * TMSSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {boolean} isInverted - The isInverted property is to be set to the
 * correct value, true or false (default being false) if the computation of the
 * coordinates needs to be inverted to match the same scheme as OSM, Google Maps
 * or other system. See [this link]{@link
 * https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/}
 * for more information.
 * @property {string} tileMatrixSet - Tile matrix set of the layer, used in the
 * generation of the coordinates to build the url. Default value is 'WGS84'.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value
 * is 0.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is 18.
 *
 * @example
 * // Create the source
 * const tmsSource = new itowns.TMSSource({
 *     format: 'image/png',
 *     url: 'http://osm.io/styles/${z}/${x}/${y}.png',
 *     attribution: {
 *         name: 'OpenStreetMap',
 *         url: 'http://www.openstreetmap.org/',
 *     },
 *     tileMatrixSet: 'PM',
 * });
 *
 * // Create the layer
 * const colorLayer = new itowns.ColorLayer('OPENSM', {
 *     source: tmsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorLayer);
 */
class TMSSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * TMSSource and {@link Source}. Only `url` is mandatory.
     *
     * @constructor
     */
    constructor(source) {
        if (!source.projection) {
            throw new Error('New TMSSource: projection is required');
        }
        super(source);

        this.isTMSSource = true;

        if (!source.extent) {
            // default to the full 3857 extent
            this.extent = new Extent('EPSG:3857',
                -20037508.342789244, 20037508.342789244,
                -20037508.342789255, 20037508.342789244);
        }

        this.zoom = source.zoom || { min: 0, max: 18 };

        this.isInverted = source.isInverted || false;

        this.format = this.format || 'image/png';
        this.url = source.url;
        this.tileMatrixSet = source.tileMatrixSet;

        this.projection = CRS.formatToTms(source.projection);
    }

    urlFromExtent(extent) {
        return URLBuilder.xyz(extent, this);
    }

    handlingError(err) {
        console.warn(`err ${this.url}`, err);
    }

    extentInsideLimit(extent) {
        // This layer provides data starting at level = layer.source.zoom.min
        // (the zoom.max property is used when building the url to make
        //  sure we don't use invalid levels)
        // TODO: add extent limit
        return extent.zoom >= this.zoom.min && extent.zoom <= this.zoom.max;
    }
}

export default TMSSource;
