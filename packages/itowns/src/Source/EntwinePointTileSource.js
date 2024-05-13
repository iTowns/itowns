import proj4 from 'proj4';
import LASParser from 'Parser/LASParser';
import PotreeBinParser from 'Parser/PotreeBinParser';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';

/**
 * @classdesc
 * An object defining the source of Entwine Point Tile data. It fetches and
 * parses the main configuration file of Entwine Point Tile format,
 * [`ept.json`](https://entwine.io/entwine-point-tile.html#ept-json).
 *
 * @extends Source
 *
 * @property {boolean} isEntwinePointTileSource - Used to checkout whether this
 * source is a EntwinePointTileSource. Default is true. You should not change
 * this, as it is used internally for optimisation.
 * @property {string} url - The URL of the directory containing the whole
 * Entwine Point Tile structure.
 */
class EntwinePointTileSource extends Source {
    /**
     * @constructor
     *
     * @param {Object} config - The configuration, see {@link Source} for
     * available values.
     * @param {number|string} [config.colorDepth='auto'] - Does the color
     * encoding is known ? Is it `8` or `16` bits ? By default it is to
     * `'auto'`, but it will be more performant if a specific value is set.
     */
    constructor(config) {
        super(config);

        this.isEntwinePointTileSource = true;
        this.colorDepth = config.colorDepth;

        // Necessary because we use the url without the ept.json part as a base
        this.url = this.url.replace('/ept.json', '');

        // https://entwine.io/entwine-point-tile.html#ept-json
        this.whenReady = Fetcher.json(`${this.url}/ept.json`, this.networkOptions).then((metadata) => {
            // Set parser and its configuration from schema
            this.parse = metadata.dataType === 'laszip' ? LASParser.parse : PotreeBinParser.parse;
            this.extension = metadata.dataType === 'laszip' ? 'laz' : 'bin';

            if (metadata.srs && metadata.srs.authority && metadata.srs.horizontal) {
                this.crs = `${metadata.srs.authority}:${metadata.srs.horizontal}`;
                if (!proj4.defs(this.crs)) {
                    proj4.defs(this.crs, metadata.srs.wkt);
                }

                if (metadata.srs.vertical && metadata.srs.vertical !== metadata.srs.horizontal) {
                    console.warn('EntwinePointTileSource: Vertical coordinates system code is not yet supported.');
                }
            }

            // NOTE: this spacing is kinda arbitrary here, we take the width and
            // length (height can be ignored), and we divide by the specified
            // span in ept.json. This needs improvements.
            this.spacing = (Math.abs(metadata.boundsConforming[3] - metadata.boundsConforming[0])
                + Math.abs(metadata.boundsConforming[4] - metadata.boundsConforming[1])) / (2 * metadata.span);

            this.boundsConforming = metadata.boundsConforming;
            this.span = metadata.span;

            return this;
        });

        this.fetcher = Fetcher.arrayBuffer;
    }
}

export default EntwinePointTileSource;
