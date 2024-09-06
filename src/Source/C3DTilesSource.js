import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';

/**
 * An object defining the source connection to a 3DTiles dataset from a web server.
 *
 * @extends Source
 *
 * @property {boolean} isC3DTilesSource - Used to checkout whether this source is a isC3DTilesSource. Default is
 * true. You should not change this, as it is used internally for optimisation.
 * @property {string} url - The URL of the tileset json.
 * @property {string} baseUrl - The base URL to access tiles.
 */
class C3DTilesSource extends Source {
    /**
     * Create a new Source for 3D Tiles data from a web server.
     *
     * @extends Source
     *
     * @param {Object} source An object that can contain all properties of {@link Source}.
     * Only `url` is mandatory.
     */
    constructor(source) {
        super(source);
        this.isC3DTilesSource = true;
        this.baseUrl = this.url.slice(0, this.url.lastIndexOf('/') + 1);
        this.whenReady = Fetcher.json(this.url, this.networkOptions);
    }
}

export default C3DTilesSource;
