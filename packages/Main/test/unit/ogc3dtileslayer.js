import assert from 'assert';
import OGC3DTilesSource from 'Source/OGC3DTilesSource';
import OGC3DTilesLayer, {
    itownsGLTFLoader,
    enableDracoLoader,
    enableKtx2Loader,
} from 'Layer/OGC3DTilesLayer';
import { WebGLRenderer } from 'three';


describe('OGC3DTilesLayer', function () {
    const source =  new OGC3DTilesSource({ url: 'https://mock.com/tileset.json' });

    it('should create 3D Tiles layer', function () {
        // Should create layer from basic source
        let ogc3DTilesLayer = new OGC3DTilesLayer('ogc3DTiles', { source });
        assert.ok(ogc3DTilesLayer);

        // Should set layer sseThreshold
        ogc3DTilesLayer = new OGC3DTilesLayer('ogc3DTiles', {
            source,
            sseThreshold: 7,
        });
        assert.equal(7, ogc3DTilesLayer.sseThreshold);

        // Should create layer from Cesium ION source
        ogc3DTilesLayer = new OGC3DTilesLayer('ogc3DTiles', {
            source: {
                isOGC3DTilesIonSource: true,
                apiToken: 'mockedApiToken',
                assetId: 'mockedAssetId',
            },
        });
        assert.ok(
            ogc3DTilesLayer.tilesRenderer.plugins.map(function (plugin) {
                return plugin.name === 'CESIUM_ION_AUTH_PLUGIN';
            }).includes(true),
        );

        // Should create layer from Google 3d Tiles source
        ogc3DTilesLayer = new OGC3DTilesLayer('ogc3DTiles', {
            source: {
                isOGC3DTilesGoogleSource: true,
                apiToken: 'mockedApiToken',
            },
        });
        assert.ok(
            ogc3DTilesLayer.tilesRenderer.plugins.map(function (plugin) {
                return plugin.name === 'GOOGLE_CLOUD_AUTH_PLUGIN';
            }).includes(true),
        );
    });

    it('should enable DracoLoader', function () {
        // Should throw error if path to draco library folder is not set
        assert.throws(
            () => { enableDracoLoader(undefined); },
            { message: 'Path to draco folder is mandatory' },
        );

        // Should set dracoLoader
        enableDracoLoader('mockedPath/');
        assert.ok(itownsGLTFLoader.glTFLoader.dracoLoader);

        // Should set dracoLoader config
        const mockedConfig = { mockedProperty: 'mockedValue' };
        enableDracoLoader('mockedPath/', mockedConfig);
        assert.equal(
            mockedConfig,
            itownsGLTFLoader.glTFLoader.dracoLoader.decoderConfig,
        );
    });

    it('should enable Ktx2Loader', function () {
        const mockedRenderer = new WebGLRenderer();
        // Should throw error if path to Ktx2 library folder is not set
        assert.throws(
            () => { enableKtx2Loader(undefined, mockedRenderer); },
            { message: 'Path to ktx2 folder and renderer are mandatory' },
        );
        assert.throws(
            () => { enableKtx2Loader('mockedPath/', undefined); },
            { message: 'Path to ktx2 folder and renderer are mandatory' },
        );

        // Should set Ktx2Loader
        enableKtx2Loader('mockedPath/', mockedRenderer);
        assert.ok(itownsGLTFLoader.glTFLoader.ktx2Loader);
    });
});
