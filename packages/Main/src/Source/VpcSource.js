import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';
import { CopcSource } from 'Main';

import vpc from '../../../../examples/layers/test_vpc_4_dalles.json';

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

        const eptUrl = 'https://download.data.grandlyon.com/files/grandlyon/imagerie/mnt2018/lidar/ept/';

        this.whenReady = Fetcher.json(`${eptUrl}/ept.json`, this.networkOptions).then(() => {
            const meta = JSON.parse(vpc);

            this.urls = meta.features.map(f => f.assets.data.href);

            // const projsWkt2 = meta.features.map(f => f.properties['proj:wkt2']);

            /* FOR ONE proj:wkt2
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

            const copcSources = [];
            this.urls.forEach((url) => {
                const copcSource = new CopcSource({ url });
                copcSources.push(copcSource.whenReady);
            });

            return Promise.all(copcSources);
        });
    }
}

export default VpcSource;
