import Source from './Source';
import URLBuilder from '../Provider/URLBuilder';

class WMTSSource extends Source {
    /**
     * Tiles images source
     * @constructor
     * @extends Source
     * @param {sourceParams}  source
     * @param {string} source.name name of layer wmts
     * @param {string} source.tileMatrixSet  define tile matrix set of wmts layer (ex: 'PM', 'WGS84')
     * @param {Array.<Object>} [source.tileMatrixSetLimits] The limits for the tile matrix set
     * @param {number} source.tileMatrixSetLimits.minTileRow Minimum row for tiles at the level
     * @param {number} source.tileMatrixSetLimits.maxTileRow Maximum row for tiles at the level
     * @param {number} source.tileMatrixSetLimits.minTileCol Minimum col for tiles at the level
     * @param {number} source.tileMatrixSetLimits.maxTileCol Maximum col for tiles at the level
     * @param {Object} [source.zoom]
     * @param {number} [source.zoom.min] layer's zoom minimum
     * @param {number} [source.zoom.max] layer's zoom maximum
     *
     * @example <caption>Add color layer with wmts source</caption>
     * const colorlayer = new ColorLayer('darkmap', {
     *     source: {
     *          protocol: 'wmts',
     *          name: 'DARK',
     *          tileMatrixSet: 'PM',
     *          url: 'http://server.geo/wmts',
     *          format: 'image/jpg',
     *     }
     * });
     * // Add the layer
     * view.addLayer(colorlayer);
     *
     */
    constructor(source) {
        super(source);

        if (!source.name) {
            throw new Error('New WMTSSource: name is required');
        }

        this.format = this.format || 'image/png';
        this.version = source.version || '1.0.0';
        this.tileMatrixSet = source.tileMatrixSet || 'WGS84';
        this.style = source.style || 'normal';
        this.name = source.name;
        this.url = `${source.url}` +
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

        // If the projection is undefined,
        // It is deduced from the tileMatrixSet,
        // The projection is coherent with the projection
        if (!this.projection) {
            if (this.tileMatrixSet === 'WGS84' || this.tileMatrixSet === 'WGS84G') {
                this.projection = 'EPSG:4326';
            } else {
                this.projection = 'EPSG:3857';
            }
        }

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
