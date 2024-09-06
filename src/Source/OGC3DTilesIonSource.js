import OGC3DTilesSource from './OGC3DTilesSource';

class OGC3DTilesIonSource extends OGC3DTilesSource {
    /**
     * An object defining the source connection to a 3DTiles asset of a [Cesium ion server](https://cesium.com/learn/ion/).
     *
     * @extends Source
     *
     * @property {boolean} isOGC3DTilesIonSource - Used to check if this source is an OGC3DTilesIonSource. Set to true.
     * You should not change this, as it is used internally for optimisation.
     * @property {string} accessToken - The Cesium ion access token used to retrieve the resource.
     * @property {string} assetId - The id of the asset on Cesium ion.
     *
     * @param {Object} source An object that can contain all properties of an OGC3DTilesIonSource and {@link Source}.
     * Only `accessToken` and `assetId` are mandatory.
     * @param {string} source.accessToken - The Cesium ion access token used to retrieve the resource.
     * @param {string} source.assetId - The id of the asset on Cesium ion.
     */
    constructor(source) {
        if (!source.accessToken) {
            throw new Error('[OGC3DTilesIonSource]: accessToken is required');
        }
        if (!source.assetId) {
            throw new Error('[OGC3DTilesIonSource]: assetId is required');
        }

        // Url to query cesium ion the first time to retrieve metadata of the asset with assetId
        source.url = `https://api.cesium.com/v1/assets/${source.assetId}/endpoint?access_token=${source.accessToken}`;
        super(source);

        this.isOGC3DTilesIonSource = true;
        this.accessToken = source.accessToken;
        this.assetId = source.assetId;
    }
}

export default OGC3DTilesIonSource;
