
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
            this.crs = source.projection;
        }

        this.tileMatrixSetLimits = source.tileMatrixSetLimits;

        // Header
        // default is 16ko block read
        this.whenReady = itowns.Fetcher.arrayBuffer(this.url, {
            headers: {
                'range': 'bytes=0-300000',
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
            this.resolution = Math.round(this.modelPixelScaleTag[0] * 1000) * 0.001;
            this.tileSize = this.ifds[0].t322[0];

            // Compute extent from GeoTiff Tag
            this.extent = new itowns.Extent(
                source.projection,
                Math.floor(this.modelTiepointTag[3] * 1000) * 0.001, 
                Math.round((this.modelTiepointTag[3] + Math.ceil(this.width / this.tileSize) * this.tileSize * this.modelPixelScaleTag[0]) * 1000) * 0.001,
                Math.round((this.modelTiepointTag[4] - Math.ceil(this.height /this.tileSize) * this.tileSize * this.modelPixelScaleTag[1]) * 1000) * 0.001, 
                Math.round(this.modelTiepointTag[4] * 1000) * 0.001);

            this.resolutions = [];
            var res = this.resolution;
            this.ifds.forEach((ifd) => {
                this.resolutions.push(res);
                res *= 2;
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
                if ((this.tileSize != tileHeight) || (this.tileSize != tileWidth)) {
                    console.warn('all tiles must have same dimensions');
                }
            });
            console.log(this.resolutions);
            console.log(this.ifds);
            console.log('READY');
        });
    }

    getTile(extent){
        const extentOrig = extent.as(this.crs);
        const requestedResolution = Math.round((extentOrig.east - extentOrig.west) / this.tileSize * 1000) * 0.001;
        return {
            ifdNum: this.resolutions.indexOf(requestedResolution),
            col: Math.round((extentOrig.west - this.extent.west) / (requestedResolution * this.tileSize) * 1000) * 0.001,
            row: Math.round((this.extent.north - extentOrig.north) / (requestedResolution * this.tileSize) * 1000) * 0.001,
        };
    }

    urlFromExtent(extent) {
        var T = this.getTile(extent);
        const ifd = this.ifds[T.ifdNum];
        const numTile = T.col + T.row * ifd.nbTileX;
        const offset = BigInt(ifd.t324[numTile]);
        const byteCounts = ifd.t325[numTile];
        const tileWidth = ifd.t322[0];
        const tileHeight = ifd.t323[0];
        // create a custom ifd copy for the TIFFParser
        extent.ifd = {};
        for (const property in ifd) {
            // width
            if (property == 't256') {
                extent.ifd[property] = [tileWidth];
            }
            // height
            else if (property == 't257') {
                extent.ifd[property] = [tileHeight];
            }
            // tile offsets
            else if (property == 't324') {
                extent.ifd[property] = [0n];
            }
            // tile byteCounts
            else if (property == 't325') {
                extent.ifd[property] = [byteCounts];
            }
            else {
                extent.ifd[property] = ifd[property];
            }
        }
        // custom the networkOptions as a range request for this specific tile 
        this.networkOptions.headers = {
            'range': `bytes=${offset}-${offset + BigInt(byteCounts) - 1n}`,
        };
        return this.url;
    }

    handlingError(err) {
        console.warn(`err ${this.url}`, err);
    }

    extentInsideLimit(extent) {
        var T = this.getTile(extent);
        return (T.ifdNum>=0)&&
                (T.ifdNum<this.ifds.length)&&
                (T.col>=0)&&(T.row>=0)&&
                (T.col<this.ifds[T.ifdNum].nbTileX)&&
                (T.row<this.ifds[T.ifdNum].nbTileY);
    }
}

if (typeof module != 'undefined' && module.exports) {
    module.exports = COGSource;
}
