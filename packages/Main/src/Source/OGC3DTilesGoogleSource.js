import OGC3DTilesSource from './OGC3DTilesSource';

class OGC3DTilesGoogleSource extends OGC3DTilesSource {
    /**
     * An object defining the source connection to a 3D Tiles asset from [Google Tiles API](https://tile.googleapis.com).
     *
     * @extends OGC3DTilesSource
     *
     * @property {boolean} isOGC3DTilesGoogleSource - Used to check if this source is an OGC3DTilesGoogleSource. Set to true.
     * You should not change this, as it is used internally for optimisation.
     * @property {string} url - The URL to the tileset json.
     * @property {string} baseUrl - The base URL to access tiles.
     *
     * @property {boolean} isOGC3DTilesGoogleSource - Used to check if this source is an OGC3DTilesGoogleSource. Set to
     * true. You should not change this, as it is used internally for optimisation.
     * @param {Object} source An object that can contain all properties of an OGC3DTilesGoogleSource and {@link Source}.
     * @param {String} source.key Your google tiles map API access key
     */
    constructor(source) {
        if (!source.key) {
            throw new Error('[OGC3DTilesGoogleSource]: A API key for the google map tiles API is required');
        }
        // URL to the root tileset
        source.url = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${source.key}`;
        super(source);
        this.isOGC3DTilesGoogleSource = true;
        this.key = source.key;
    }
}

export default OGC3DTilesGoogleSource;
