import Source from 'Source/Source';
import URLBuilder from 'Provider/URLBuilder';
import CRS from 'Core/Geographic/Crs';

/**
 * @classdesc
 * An object defining the source of resources to get from a
 * [WMTS]{@link http://www.opengeospatial.org/standards/wmts} server. It inherits
 * from {@link Source}.
 *
 * @extends Source
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
 * @property {string} projection - The projection in which to fetch the data. If
 * not specified, it is deduced from `tileMatrixSet`. Default value is
 * 'EPSG:3857'.
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
class WMTSSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * WMTSSource and {@link Source}. Only `url` and `name` are mandatory.
     *
     * @constructor
     */
    constructor(source) {
        if (!source.name) {
            throw new Error('New WMTSSource: name is required');
        }

        if (!source.projection) {
            throw new Error('New WMTSSource: projection is required');
        }

        super(source);

        this.isWMTSSource = true;

        this.format = this.format || 'image/png';
        this.version = source.version || '1.0.0';
        this.tileMatrixSet = source.tileMatrixSet || 'WGS84';
        this.style = source.style || 'normal';
        this.name = source.name;
        this.url = `${this.url}` +
            `?LAYER=${this.name}` +
            `&FORMAT=${this.format}` +
            '&SERVICE=WMTS' +
            `&VERSION=${this.version}` +
            '&REQUEST=GetTile' +
            `&STYLE=${this.style}` +
            `&TILEMATRIXSET=${this.tileMatrixSet}` +
            '&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';

        this.zoom = source.zoom;
        this.tileMatrixSetLimits = source.tileMatrixSetLimits;
        this.projection = CRS.formatToTms(source.projection);

        if (!this.zoom) {
            if (this.tileMatrixSetLimits) {
                const arrayLimits = Object.keys(this.tileMatrixSetLimits);
                const size = arrayLimits.length;
                const maxZoom = Number(arrayLimits[size - 1]);
                const minZoom = maxZoom - size + 1;

                this.zoom = {
                    min: minZoom,
                    max: maxZoom,
                };
            } else {
                this.zoom = { min: 2, max: 20 };
            }
        }
    }

    urlFromExtent(extent) {
        return URLBuilder.xyz(extent, this);
    }

    extentInsideLimit(extent) {
        return extent.zoom >= this.zoom.min && extent.zoom <= this.zoom.max &&
                (this.tileMatrixSetLimits == undefined ||
                (extent.row >= this.tileMatrixSetLimits[extent.zoom].minTileRow &&
                    extent.row <= this.tileMatrixSetLimits[extent.zoom].maxTileRow &&
                    extent.col >= this.tileMatrixSetLimits[extent.zoom].minTileCol &&
                    extent.col <= this.tileMatrixSetLimits[extent.zoom].maxTileCol));
    }
}

export default WMTSSource;
