import LASParser from 'Parser/LASParser';
import PotreeBinParser from 'Parser/PotreeBinParser';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';
import { CRS } from 'Main';

/**
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
     * @param {Object} config - The configuration, see {@link Source} for
     * available values.
     * @param {number} [config.colorDepth] - Color depth (in bits).
     * Either 8 or 16 bits. By defaults it will be set to 8 bits for LAS 1.2 and
     * 16 bits for later versions (as mandatory by the specification).
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

            if (metadata.srs) {
                if (metadata.srs.authority && metadata.srs.horizontal) {
                    this.crs = `${metadata.srs.authority}:${metadata.srs.horizontal}`;
                    if (!CRS.defs(this.crs)) {
                        CRS.defs(this.crs, metadata.srs.wkt);
                    }
                } else if (metadata.srs.wkt) {
                    this.crs = CRS.defsFromWkt(metadata.srs.wkt);
                }
                if (metadata.srs.vertical && metadata.srs.vertical !== metadata.srs.horizontal) {
                    console.warn('EntwinePointTileSource: Vertical coordinates system code is not yet supported.');
                }
            }

            this.boundsConforming = metadata.boundsConforming;
            this.bounds = metadata.bounds; // xMin, yMin, zMin, xMax, yMax, zMax
            this.span = metadata.span;

            // NOTE: this spacing is kinda arbitrary here, we take the width and
            // length (height can be ignored), and we divide by the specified
            // span in ept.json. This needs improvements.
            this.spacing = (Math.abs(this.bounds[3] - this.bounds[0])
                + Math.abs(this.bounds[4] - this.bounds[1])) / (2 * this.span);

            return this;
        });

        this.fetcher = Fetcher.arrayBuffer;
    }
}

export default EntwinePointTileSource;
