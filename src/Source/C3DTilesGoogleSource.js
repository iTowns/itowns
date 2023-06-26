import Fetcher from 'Provider/Fetcher';
import C3DTilesSource from './C3DTilesSource';

/**
 * @classdesc
 * An object defining the source connection to a 3DTiles asset of a [Google api](https://tile.googleapis.com).
 *
 * @extends Source
 *
 * @property {boolean} isC3DTilesGoogleSource - Used to checkout whether this source is a C3DTilesGoogleSource. Default is
 * true. You should not change this, as it is used internally for optimisation.
 * @property {string} url - The URL of the tileset json.
 * @property {string} baseUrl - The base URL to access tiles.
 */
class C3DTilesGoogleSource extends C3DTilesSource {
    /**
     * Create a new Source for 3D Tiles data from Google api.
     *
     * @constructor
     * @extends Source
     *
     * @property {boolean} isC3DTilesGoogleSource - Used to checkout whether this source is a C3DTilesGoogleSource. Default is
     * true. You should not change this, as it is used internally for optimisation.
     * @param {Object} source An object that can contain all properties of a C3DTilesGoogleSource and {@link Source}.
     *
     * Providing urlParameters with key is mandatory to request a specific tile.
     */
    constructor(source) {
        if (!source.urlParameters || !source.urlParameters.key) {
            throw new Error('New 3D Tiles Google Source: a key is required as urlParameters');
        }
        super(source);
        this.isC3DTilesGoogleSource = true;
        this.baseUrl =  'https://tile.googleapis.com';
        this.whenReady = Fetcher.json(source.url, this.networkOptions, this.urlParameters);
    }

    completeMetadata(metadata) {
        if (!metadata.content) {
            return metadata;
        }
        if (!this.urlParameters.session) {
            // try to register session onto the source
            if (metadata.content.uri) {
                if (metadata.content.uri.indexOf('?') !== -1) {
                    const uri = metadata.content.uri.substr(metadata.content.uri.indexOf('?') + 1);
                    const sessionIds = uri.split('=');
                    this.urlParameters.session = sessionIds[1] !== undefined ? sessionIds[1] : '';
                }
            } else {
                throw new Error('C3DTilesGoogleSource: uri is required');
            }
        }
        metadata.baseURL = this.baseUrl;
        return metadata;
    }
}

export default C3DTilesGoogleSource;
