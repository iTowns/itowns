
/**
 * @classdesc
 * An object defining the source of resources to get from a [COG]{@link
 * https://www.cogeo.org/} file. It
 * inherits from {@link Source}.
 *
 * @extends Source
 *
 * @property {boolean} isCOGSource - Used to checkout whether this source is a
 * COGSource. Default is true. You should not change this, as it is used
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
 * is computed from the COG file.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is computed from the COG file.
 *
 * @example
 * // Create the source
 * const cogSource = new itowns.COGSource({
 *     url: 'http://osm.io/styles/${z}/${x}/${y}.png',
 *     tileMatrixSet: 'PM',
 *     parser: TIFFParser.parse,
 *     fetcher: itowns.Fetcher.arrayBuffer,
 * });
 *
 * // Create the layer
 * const colorLayer = new itowns.ColorLayer('COG', {
 *     source: cogSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorLayer);
 */
class COGSource extends itowns.Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * COGSource and {@link Source}. Only `url` is mandatory.
     *
     * @constructor
     */
    constructor(source) {
        if (!source.projection) {
            throw new Error('New COGSource: projection is required');
        }
        super(source);

        this.isCOGSource = true;

        if (source.zoom) {
            this.zoom = source.zoom;
        }

        this.isInverted = source.isInverted || false;
        this.format = this.format || 'image/png';
        this.url = source.url;

        if (source.projection) {
            this.projection = itowns.CRS.formatToTms(source.projection);
        }

        this.tileMatrixSetLimits = source.tileMatrixSetLimits;

        // Header
        // default is 16ko block read
        this.whenReady = itowns.Fetcher.arrayBuffer(this.url, {
            headers: {
                'range': 'bytes=0-16000',
            },
        }).then((response) => {
            this.ifds = UTIF.decode(response);
            console.log(this.ifds);
            // Georef
            this.modelTiepointTag = this.ifds[0].t33922;
            this.modelPixelScaleTag = this.ifds[0].t33550;
            this.geoKeyDirectoryTag = this.ifds[0].t34735;
            this.geoDoubleParamsTag = this.ifds[0].t34736;
            this.geoAsciiParamsTag = this.ifds[0].t34737;
            this.width = this.ifds[0].t256[0];
            this.height = this.ifds[0].t257[0];

            // Compute extent from GeoTiff Tag
            this.extent = new itowns.Extent(
                source.projection,
                this.modelTiepointTag[3], this.modelTiepointTag[3] + this.width * this.modelPixelScaleTag[0],
                this.modelTiepointTag[4] - this.height * this.modelPixelScaleTag[1], this.modelTiepointTag[4]);

            this.tileSize = this.ifds[0].t322[0];
            this.zoomMax = Math.ceil(Math.log2(Math.max(this.width, this.height) / this.tileSize));
            console.log('zoomMax : ', this.zoomMax);
            if (!this.zoom) {
                this.zoom = {
                    min: this.zoomMax - this.ifds.length + 1,
                    max: this.zoomMax,
                };
                console.log(this.zoom);
            }
            var tileMaxtrixSetLimits = {};
            var level = this.zoom.max;
            this.ifds.forEach((ifd) => {
                // Format Image
                // var bitsPerSample = ifd.t258;
                // var sampleFormat = ifd.t339;
                // console.log('Nombre de canaux : ', bitsPerSample.length);
                const width = ifd.t256[0];
                const height = ifd.t257[0];
                // var tileOffsets = ifd.t324;
                // var tileByteCounts = ifd.t325;
                const tileWidth = ifd.t322[0];
                const tileHeight = ifd.t323[0];
                ifd.nbTileX = Math.ceil(width / tileWidth);
                ifd.nbTileY = Math.ceil(height / tileHeight);
                tileMaxtrixSetLimits[level] = {
                    "minTileRow": 0,
                    "maxTileRow": ifd.nbTileY,
                    "minTileCol": 0,
                    "maxTileCol": ifd.nbTileX,
                }
                if ((this.tileSize != tileHeight) || (this.tileSize != tileWidth)) {
                    console.warn('all tiles must have same dimensions');
                }
                level -= 1;
            });
            if (!this.tileMaxtrixSetLimits) {
                this.tileMaxtrixSetLimits = tileMaxtrixSetLimits;
            }
        });
    }

    urlFromExtent(extent) {
        // Copy Ifd and add if to extent (for the parser)
        const ifdNum = this.zoomMax - extent.zoom;
        extent.ifd = JSON.parse(JSON.stringify(this.ifds[ifdNum]));
        // get the offset/byteCount for the tile
        const numTile = extent.col + extent.row * extent.ifd.nbTileX;
        const offset = extent.ifd.t324[numTile];
        const byteCounts = extent.ifd.t325[numTile];
        // custom the networkOptions as a range request for this specific tile 
        this.networkOptions.headers = {
            'range': `bytes=${offset}-${offset + byteCounts - 1}`,
        };
        // update the ifd copy for the TIFFParser
        // width/heigth from the tile size
        extent.ifd.t256[0] = extent.ifd.t322[0];
        extent.ifd.t257[0] = extent.ifd.t323[0];
        // offset and byteCounts
        extent.ifd.t324 = [0];
        extent.ifd.t325 = [byteCounts];
        return this.url;
    }

    handlingError(err) {
        console.warn(`err ${this.url}`, err);
    }

    extentInsideLimit(extent) {
        // This layer provides data starting at level = layer.source.zoom.min
        // (the zoom.max property is used when building the url to make
        //  sure we don't use invalid levels)
        return extent.zoom >= this.zoom.min && extent.zoom <= this.zoom.max &&
                (this.tileMatrixSetLimits == undefined ||
                (extent.row >= this.tileMatrixSetLimits[extent.zoom].minTileRow &&
                    extent.row <= this.tileMatrixSetLimits[extent.zoom].maxTileRow &&
                    extent.col >= this.tileMatrixSetLimits[extent.zoom].minTileCol &&
                    extent.col <= this.tileMatrixSetLimits[extent.zoom].maxTileCol));
    }
}

if (typeof module != 'undefined' && module.exports) {
    module.exports = COGSource;
}
