import assert from 'assert';
import OGC3DTilesSource from 'Source/OGC3DTilesSource';
import OGC3DTilesLayer, {
    itownsGLTFLoader,
    enableDracoLoader,
    enableKtx2Loader,
    enableMeshoptDecoder,
} from 'Layer/OGC3DTilesLayer';
import { BufferAttribute, Matrix4, Vector3, WebGLRenderer } from 'three';

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

    it('should enable MeshOptDecoder', function () {
        const MeshOptDecoder = {};

        assert.throws(
            () => { enableMeshoptDecoder(undefined); },
            { message: 'MeshOptDecoder module is mandatory' },
        );

        // Should set MeshOptDecoder
        enableMeshoptDecoder(MeshOptDecoder);
        assert.ok(itownsGLTFLoader.glTFLoader.meshoptDecoder);
    });

    it('should not return metadata when there is no EXT_structural_metadata', async function () {
        const layer = new OGC3DTilesLayer('ogc3DTiles', { source });
        const intersection = { object: { userData: {} } };

        assert.deepEqual(
            await layer.getMetadataFromIntersections([intersection]),
            [],
        );
    });

    it('should return metadata if EXT_structural_metadata is present', async function () {
        const layer = new OGC3DTilesLayer('ogc3DTiles', { source });

        // Mock StructuralMetadata by returning the parameters as metadata.
        const structuralMetadata = {
            getPropertyAttributeData(index, attributeData) {
                attributeData.push({ index });
            },
            getPropertyTextureData(faceIndex, barycoord, textureData) {
                textureData.push({ faceIndex, barycoord });
            },
            getPropertyTableData(tableIndices, features, tableData) {
                tableData.push({ tableIndices, features });
            },
        };

        // Mock MeshFeatures
        const meshFeatures = {
            getFeaturesAsync() {
                return Promise.resolve([0]);
            },
            getFeatureInfo() {
                return [
                    { label: '', propertyTable: 0, nullFeatureId: null },
                    { label: '', propertyTable: 1, nullFeatureId: null },
                    { label: '', propertyTable: 2, nullFeatureId: null },
                ];
            },
        };

        // Test the access to the metadata associated to this vertex
        const vertexMetadata = await layer.getMetadataFromIntersections([{
            object: { userData: { structuralMetadata } },
            index: 0,
        }]);
        assert.deepEqual(vertexMetadata, [{
            index: 0,
        }]);

        // Test the access to the metadata associated to the index of this face
        const uvMetadata = await layer.getMetadataFromIntersections([{
            object: { userData: { structuralMetadata } },
            faceIndex: 0,
        }]);
        assert.deepEqual(uvMetadata, [{
            barycoord: { x: 0, y: 0, z: 0 },
            faceIndex: 0,
        }]);

        // Test the access to the metadata associated to the face and its index
        const uvMetadataWithFace = await layer.getMetadataFromIntersections([{
            point: new Vector3(),
            object: {
                geometry: {
                    getAttribute() {
                        return new BufferAttribute(new Float32Array([
                            -1.0, -1.0, +1.0,
                            +1.0, -1.0, +1.0,
                            +1.0, +1.0, +1.0,
                        ]), 3);
                    },
                },
                matrixWorld: new Matrix4(),
                userData: { structuralMetadata },
            },
            face: { a: 0, b: 1, c: 2 },
            faceIndex: 0,
        }]);
        assert.deepEqual(uvMetadataWithFace, [{
            barycoord: { x: 0.5, y: 0, z: 0.5 },
            faceIndex: 0,
        }]);

        const featureMetadata = await layer.getMetadataFromIntersections([{
            object: {
                userData: { meshFeatures, structuralMetadata },
            },
        }]);
        assert.deepEqual(featureMetadata, [{
            tableIndices: [0, 1, 2],
            features: [0],
        }]);
    });
});
