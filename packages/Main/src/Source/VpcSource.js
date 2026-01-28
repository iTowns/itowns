import { CRS } from '@itowns/geographic';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';
import EntwinePointTileSource from 'Source/EntwinePointTileSource';
import CopcSource from 'Source/CopcSource';

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
 * @property {Object[]|PointCloudSource[]} sources - Array of all the source described in the VPC.
 * initialized with mockSource that will be replace by COPC or EPT Source as soon as any data need
 * to be loaded.
 */
class VpcSource extends Source {
    /**
     * @param {Object} config - The configuration, see {@link Source} for
     * available values.
     * @param {number} [config.colorDepth] - Color depth (in bits).
     * Either 8 or 16 bits. By defaults it will be set to 8 bits for LAS 1.2 and
     * 16 bits for later versions (as mandatory by the specification).
     */
    constructor(config) {
        super(config);

        this.isVpcSource = true;
        this.sources = [];

        this.colorDepth = config.colorDepth;

        this.spacing = Infinity;

        this.whenReady = Fetcher.json(this.url, this.networkOptions)
            .then((metadata) => {
                this.metadata = metadata;

                // Set the Crs of the VPC Layer.
                const projsWkt2 = metadata.features.map(f => f.properties['proj:wkt2']);
                const crs = [...new Set(projsWkt2)];
                if (crs.length !== 1) {
                    console.warn('Only 1 crs is supported for 1 vpc.');
                }
                this.crs = CRS.defsFromWkt(projsWkt2[0]);

                // Set boundsConformings (the bbox) of the VPC Layer
                const boundsConformings = metadata.features
                    .filter(f => f.properties['proj:wkt2'] === projsWkt2[0])
                    .map(f => f.properties['proj:bbox']);

                this.boundsConforming = [
                    Math.min(...boundsConformings.map(b => b[0])),
                    Math.min(...boundsConformings.map(b => b[1])),
                    Math.min(...boundsConformings.map(b => b[2])),
                    Math.max(...boundsConformings.map(b => b[3])),
                    Math.max(...boundsConformings.map(b => b[4])),
                    Math.max(...boundsConformings.map(b => b[5])),
                ];

                // Set the zmin and zmax from the source
                this.zmin = this.boundsConforming[2];
                this.zmax = this.boundsConforming[5];

                /* Set  several object (MockSource) to mock the source that will need to be instantiated.
                 We don't want all child source to be instantiated at once as it will send the fetch request
                 (current architectural choice) thus we want to delay the instanciation of the child source
                 when the data need to be load on a particular node.
                 Creation of 1 mockSource for each item in the stack (that will be replace by a real source
                 when needed, when we will call the load on a node depending of that source).
                */
                this._promises = [];
                this.urls = metadata.features.map(f => f.assets.data.href);
                this.urls.forEach((url, i) => {
                    let resolve;
                    let reject;
                    const whenReady = new Promise((re, rj) => {
                        // waiting for source to be instantiate;
                        resolve = re;
                        reject = rj;
                    }).catch((err) => {
                        console.warn(err);
                        this.handlingError(err);
                    });

                    const mockSource = {
                        boundsConforming: boundsConformings[i],
                        whenReady,
                        crs: CRS.defsFromWkt(projsWkt2[i]),
                        instantiate: () => {
                            let newSource;

                            if (url.includes('.copc')) {
                                newSource = new CopcSource({ url });
                            } else if (url.includes('.json')) {
                                newSource = new EntwinePointTileSource({ url });
                            } else {
                                const err = new Error('[VPCLayer]: stack point cloud format not supporter');
                                reject(err);
                            }

                            resolve(newSource.whenReady);

                            this.sources[i] = newSource;

                            return newSource;
                        },
                        instantiation: false,
                    };
                    this.sources.push(mockSource);
                });
                return this;
            });
    }
}

export default VpcSource;
