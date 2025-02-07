import TMSSource from 'Source/TMSSource';

/**
 * An object defining the source of resources to get from a
 * [WMTS](http://www.opengeospatial.org/standards/wmts) server. It inherits
 * from {@link TMSSource}.
 *
 * @extends TMSSource
 *
 * @property {boolean} isWMTSSource - Used to checkout whether this source is a
 * WMTSSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {string} name - The name of the layer, used in the generation of
 * the url.
 * @property {string} version - The version of the WMTS server to request on.
 * Default value is '1.0.0'.
 * @property {string} style - The style to query on the WMTS server. Default
 * value is 'normal'.
 * @property {string} crs - The crs projection in which to fetch the data.
 * @property {string} tileMatrixSet - Tile matrix set of the layer, used in the
 * generation of the url. Default value is 'WGS84'.
 * @property {Object} tileMatrixSetLimits - Limits of the tile matrix set. Each
 * limit has for key its level number, and their properties are the
 * `minTileRow`, `maxTileRow`, `minTileCol` and `maxTileCol`.
 * @property {number} tileMatrixSetLimits.minTileRow - Minimum row for tiles at
 * the specified level.
 * @property {number} tileMatrixSetLimits.maxTileRow - Maximum row for tiles at
 * the specified level.
 * @property {number} tileMatrixSetLimits.minTileCol - Minimum column for tiles
 * at the specified level.
 * @property {number} tileMatrixSetLimits.maxTileCol - Maximum column for tiles
 * at the specified level.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value
 * is 2.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is 20.
 * @property {Object} vendorSpecific - An object containing vendor specific
 * parameters. This object is read simply with the `key` being the name of the
 * parameter and `value` being the value of the parameter. If used, this
 * property should be set in the constructor parameters.
 *
 * @example
 * // Create the source
 * const wmtsSource = new itowns.WMTSSource({
 *     name: 'DARK',
 *     tileMatrixSet: 'PM',
 *     url: 'http://server.geo/wmts',
 *     format: 'image/jpg',
 * });
 *
 * // Create the layer
 * const colorLayer = new itowns.ColorLayer('darkmap', {
 *     source: wmtsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorLayer);
 */
class WMTSSource extends TMSSource {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * WMTSSource and {@link Source}. Only `url`, `name` and `crs` are mandatory.
     */
    constructor(source) {
        if (!source.name) {
            throw new Error('New WMTSSource: name is required');
        }

        super(source);

        this.isWMTSSource = true;

        const urlObj = new URL(this.url);
        urlObj.searchParams.set('LAYER', source.name);
        urlObj.searchParams.set('FORMAT', this.format);
        urlObj.searchParams.set('SERVICE', 'WMTS');
        urlObj.searchParams.set('VERSION', source.version || '1.0.0');
        urlObj.searchParams.set('REQUEST', 'GetTile');
        urlObj.searchParams.set('STYLE', source.style || 'normal');
        urlObj.searchParams.set('TILEMATRIXSET', source.tileMatrixSet);
        urlObj.searchParams.set('TILEMATRIX', '%TILEMATRIX');
        urlObj.searchParams.set('TILEROW', '%ROW');
        urlObj.searchParams.set('TILECOL', '%COL');

        this.vendorSpecific = source.vendorSpecific;
        for (const name in this.vendorSpecific) {
            if (Object.prototype.hasOwnProperty.call(this.vendorSpecific, name)) {
                urlObj.searchParams.set(name, this.vendorSpecific[name]);
            }
        }

        this.url = decodeURIComponent(urlObj.toString());
    }
}

export default WMTSSource;
