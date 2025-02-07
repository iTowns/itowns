import Source from 'Source/Source';

class OGC3DTilesSource extends Source {
    /**
     * An object defining the source connection to a 3DTiles dataset from a web server.
     *
     * @extends Source
     *
     * @property {boolean} isOGC3DTilesSource - Used to check if this source is an isOGC3DTilesSource. Set to true.
     * You should not change this, as it is used internally for optimisation.
     * @property {string} url - The URL of the tileset json.
     *
     * @param {Object} source An object that can contain all properties of OGC3DTilesSource and of {@link Source}.
     * Only `url` is mandatory.
     * @param {string} source.url - The URL of the tileset json.
     */
    constructor(source) {
        super(source);
        this.isOGC3DTilesSource = true;
    }
}

export default OGC3DTilesSource;
