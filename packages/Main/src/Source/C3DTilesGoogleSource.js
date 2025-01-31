import Fetcher from 'Provider/Fetcher';
import C3DTilesSource from './C3DTilesSource';

function findSessionId(tile) {
    if (!tile) {
        return null;
    }
    if (tile.content && tile.content.uri) {
        const searchParams = new URLSearchParams(tile.content.uri.slice(tile.content.uri.indexOf('?') + 1));
        return searchParams.get('session');
    } else if (tile.children && tile.children.length > 0) {
        for (const c of tile.children) {
            const sessionId = findSessionId(c);
            if (sessionId) {
                return sessionId;
            }
        }
    }
    return null;
}

/**
 * An object defining the source connection to a 3DTiles asset from a [Google api](https://tile.googleapis.com).
 *
 * @extends C3DTilesSource
 *
 * @property {boolean} isC3DTilesGoogleSource - Used to checkout whether this source is a C3DTilesGoogleSource. Default is
 * true. You should not change this, as it is used internally for optimisation.
 * @property {string} url - The URL to the tileset json.
 * @property {string} baseUrl - The base URL to access tiles.
 */
class C3DTilesGoogleSource extends C3DTilesSource {
    /**
     * Create a new Source for 3D Tiles data from Google api (experimental).
     *
     * @extends C3DTilesSource
     *
     * @property {boolean} isC3DTilesGoogleSource - Used to checkout whether this source is a C3DTilesGoogleSource. Default is
     * true. You should not change this, as it is used internally for optimisation.
     * @param {Object} source An object that can contain all properties of a C3DTilesGoogleSource and {@link Source}.
     * @param {String} source.key Your google tiles map API access key
     */
    constructor(source) {
        if (!source.key) {
            throw new Error('[C3DTilesGoogleSource]: A API key for the google map tiles API is required');
        }
        // URL to the root tileset
        source.url = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${source.key}`;
        super(source);
        this.isC3DTilesGoogleSource = true;
        this.baseUrl =  'https://tile.googleapis.com';
        this.key = source.key;
        this.whenReady = Fetcher.json(source.url, this.networkOptions).then((json) => {
            if (json && json.root) {
                this.sessionId = findSessionId(json.root);
                if (this.sessionId === null) {
                    throw new Error('[C3DTilesGoogleSource]: Cannot find sessionId from the tileset while it is mandatory to request tiles.');
                }
            }
            return json;
        });
    }

    /**
     * Adds the key and session to the tile url (non-standard behaviour, that is specific to Google 3D tiles),
     * see https://github.com/CesiumGS/3d-tiles/issues/746
     * @param {String} url the tile url
     * @returns {String} the tile url with Google map tiles api key and session parameters added at the end of the url
     */
    getTileUrl(url) {
        const extraParameters = `key=${this.key}&session=${this.sessionId}`;
        return /\?/.test(url) ? `${url}&${extraParameters}` : `${url}?${extraParameters}`;
    }
}

export default C3DTilesGoogleSource;
