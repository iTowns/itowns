import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';
import { CopcSource, EntwinePointTileSource } from 'Main';

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
class VpcSource extends Source {
    /**
     * @param {Object} config - The configuration, see {@link Source} for
     * available values.
     * @param {number|string} [config.colorDepth='auto'] - Does the color
     * encoding is known ? Is it `8` or `16` bits ? By default it is to
     * `'auto'`, but it will be more performant if a specific value is set.
     */
    constructor(config) {
        super(config);

        this.isVpcSource = true;

        this.parser = LASParser.parseChunk;
        this.fetcher = Fetcher.arrayBuffer;

        this.colorDepth = config.colorDepth ?? 16;

        const urlVpc = this.url;
        this.whenReady = Fetcher.json(urlVpc, this.networkOptions).then((meta) => {
            this.urls = meta.features.map(f => f.assets.data.href);

            const boundsConformings = meta.features.map(f => f.properties['proj:bbox']);
            this.minElevation = Math.min(...boundsConformings.map(bC => bC[2]));
            this.maxElevation = Math.max(...boundsConformings.map(bC => bC[5]));

            /* FOR ONE proj:wkt2
            const projsWkt2 = meta.features.map(f => f.properties['proj:wkt2']);
            proj4.defs('unknown', projsWkt2[0]);
            let projCS;

            if (proj4.defs('unknown').type === 'COMPD_CS') {
                console.warn('CopcSource: compound coordinate system is not yet supported.');
                projCS = proj4.defs('unknown').PROJCS;
            } else {
                projCS = proj4.defs('unknown');
            }

            this.crs = projCS.title || projCS.name || 'EPSG:4326';
            if (!(this.crs in proj4.defs)) {
                proj4.defs(this.crs, projCS);
            }
            */

            this.sources = [];
            this.promises = [];
            this.urls.forEach((url, i) => {
                const p = new Promise((re, rj) => {
                    this.promises.push({ resolve: re, reject: rj });
                }).then((res) => {
                    this.sources[i] = res;
                    return res;
                });

                const mockSource = {
                    url,
                    boundsConforming: boundsConformings[i],
                    whenReady: p,
                };
                this.sources.push(mockSource);
            });

            return this.sources;
        });
    }

    load(index) {
        const url = this.urls[index];
        let source;
        if (url.includes('.copc')) {
            source = new CopcSource({ url });
        } else {
            source = new EntwinePointTileSource({ url });
        }
        this.promises[index].resolve(source.whenReady);
    }
}

export default VpcSource;
