import assert from 'assert';
import * as THREE from 'three';
import OGC3DTilesSource from 'Source/OGC3DTilesSource';
import OGC3DTilesLayer, {
    itownsGLTFLoader,
    enableDracoLoader,
    enableKtx2Loader,
    enableMeshoptDecoder,
} from 'Layer/OGC3DTilesLayer';
import { BufferAttribute, PointsMaterial, Matrix4, Vector3, WebGLRenderer } from 'three';

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

    it('should not assign a material to an Object3D', function () {
        const material = {};
        const model = { material };
        const layer = new OGC3DTilesLayer('ogc3DTiles', { source });

        layer._assignFinalMaterial(model);

        assert.equal(model.material, material);
    });

    it('should link standard material properties to layer properties', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        const material = { opacity: 1.0, transparent: false, wireframe: false };
        const model = { isMesh: true, material };

        layer._assignFinalMaterial(model);

        layer.opacity = 1.0;
        assert.equal(material.opacity, layer.opacity);
        assert.equal(material.transparent, layer.opacity < 1.0);

        layer.opacity = 0.5;
        assert.equal(material.opacity, layer.opacity);
        assert.equal(material.transparent, layer.opacity < 1.0);

        layer.wireframe = true;
        assert.equal(material.wireframe, layer.wireframe);

        layer.wireframe = false;
        assert.equal(material.wireframe, layer.wireframe);
    });

    it('assign and link points material properties to layer properties', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        const oldMaterial = new PointsMaterial();
        const model = { isPoints: true, material: oldMaterial };

        layer._assignFinalMaterial(model);
        const material = model.material;

        assert.notEqual(material, oldMaterial);

        layer.opacity = 1.0;
        assert.equal(material.opacity, layer.opacity);
        assert.equal(material.transparent, layer.opacity < 1.0);

        layer.opacity = 0.5;
        assert.equal(material.opacity, layer.opacity);
        assert.equal(material.transparent, layer.opacity < 1.0);

        layer.opacity = 1.0;
        material.classificationTexture.userData.transparent = false;
        assert.equal(material.opacity, layer.opacity);
        assert.equal(material.transparent, layer.opacity < 1.0);
    });

    // Helper: create a mock tile scene with _FEATURE_ID_0 attribute (3D Tiles 1.1)
    function createMockScene11(featureIds) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(featureIds.length * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute(
            '_FEATURE_ID_0',
            new THREE.BufferAttribute(new Uint16Array(featureIds), 1),
        );

        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.isMesh = true;

        const scene = new THREE.Group();
        scene.add(mesh);
        return { scene, mesh, material };
    }

    it('should initialize features from _FEATURE_ID_0 (3D Tiles 1.1)', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        // 6 vertices: feature 0 (3 verts), feature 1 (2 verts), feature 2 (1 vert)
        const { scene } = createMockScene11([0, 0, 0, 1, 1, 2]);

        layer._initFeatures(scene);

        assert.equal(layer._tileFeatures.size, 1);
        const featuresMap = layer._tileFeatures.get(scene);
        assert.ok(featuresMap);
        assert.equal(featuresMap.size, 3);

        const f0 = featuresMap.get(0);
        assert.equal(f0.batchId, 0);
        assert.deepEqual(f0.groups, [{ start: 0, count: 3 }]);

        const f1 = featuresMap.get(1);
        assert.equal(f1.batchId, 1);
        assert.deepEqual(f1.groups, [{ start: 3, count: 2 }]);

        const f2 = featuresMap.get(2);
        assert.equal(f2.batchId, 2);
        assert.deepEqual(f2.groups, [{ start: 5, count: 1 }]);
    });

    it('should initialize features from _batchid (3D Tiles 1.0 fallback)', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(9); // 3 vertices
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute(
            '_batchid',
            new THREE.BufferAttribute(new Int32Array([5, 5, 7]), 1),
        );

        const material = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.isMesh = true;

        const scene = new THREE.Group();
        scene.add(mesh);

        layer._initFeatures(scene);

        const featuresMap = layer._tileFeatures.get(scene);
        assert.equal(featuresMap.size, 2);
        assert.ok(featuresMap.has(5));
        assert.ok(featuresMap.has(7));
    });

    // Helper: create a mock indexed tile scene with _FEATURE_ID_0
    function createMockScene11Indexed(featureIds, indices) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(featureIds.length * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute(
            '_FEATURE_ID_0',
            new THREE.BufferAttribute(new Uint16Array(featureIds), 1),
        );
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.isMesh = true;

        const scene = new THREE.Group();
        scene.add(mesh);
        return { scene, mesh, material };
    }

    it('should initialize features from indexed geometry', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        // 4 vertices with feature IDs: [0, 0, 1, 1]
        // Index buffer references them: [0, 1, 2,  2, 3, 0] (6 indices, 2 triangles)
        // Indices 0-2 map to vertices 0,1,2 => feature IDs 0,0,1
        //   index 0 -> vertex 0 -> fid 0
        //   index 1 -> vertex 1 -> fid 0
        //   index 2 -> vertex 2 -> fid 1 (different => split)
        // Indices 3-5 map to vertices 2,3,0 => feature IDs 1,1,0
        //   index 3 -> vertex 2 -> fid 1
        //   index 4 -> vertex 3 -> fid 1
        //   index 5 -> vertex 0 -> fid 0 (different => split)
        const { scene } = createMockScene11Indexed(
            [0, 0, 1, 1],
            [0, 1, 2, 2, 3, 0],
        );

        layer._initFeatures(scene);

        const featuresMap = layer._tileFeatures.get(scene);
        assert.ok(featuresMap);
        assert.equal(featuresMap.size, 2);

        const f0 = featuresMap.get(0);
        assert.equal(f0.batchId, 0);
        // Feature 0 appears in two non-contiguous runs in the index buffer:
        // indices [0,1] (start=0, count=2) and index [5] (start=5, count=1)
        assert.deepEqual(f0.groups, [
            { start: 0, count: 2 },
            { start: 5, count: 1 },
        ]);

        const f1 = featuresMap.get(1);
        assert.equal(f1.batchId, 1);
        // Feature 1: indices [2,3,4] (start=2, count=3)
        assert.deepEqual(f1.groups, [{ start: 2, count: 3 }]);
    });

    it('should apply style to features and create materials', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        const { scene } = createMockScene11([0, 0, 1, 1]);

        layer._initFeatures(scene);

        layer.style = {
            fill: {
                color: (feature) => {
                    if (feature.batchId === 0) { return 'red'; }
                    return 'blue';
                },
                opacity: 1.0,
            },
        };

        // 2 distinct colors => 2 materials
        assert.equal(layer.materialCount, 2);
    });

    it('should restore original materials when style is set to null', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        const { scene, mesh, material: originalMaterial } = createMockScene11([0, 0, 1, 1]);

        layer._initFeatures(scene);

        // Apply style
        layer.style = {
            fill: {
                color: 'red',
                opacity: 1.0,
            },
        };

        assert.notEqual(mesh.material, originalMaterial);

        // Remove style
        layer.style = null;

        assert.equal(mesh.material, originalMaterial);
        assert.equal(layer.materialCount, 0);
    });

    it('should clean up tile features on dispose', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        const { scene } = createMockScene11([0, 0, 1, 1]);

        layer._initFeatures(scene);
        assert.equal(layer._tileFeatures.size, 1);

        layer._cleanupTileFeatures(scene);
        assert.equal(layer._tileFeatures.size, 0);
    });

    it('should pick features using _FEATURE_ID_0', function () {
        const layer = new OGC3DTilesLayer('3dtiles', { source });
        const { scene, mesh } = createMockScene11([0, 0, 0, 1, 1, 2]);

        layer._initFeatures(scene);

        // Simulate picking vertex at face.a = 4 (featureId = 1)
        const intersects = [{
            face: { a: 4, b: 5, c: 3 },
            object: mesh,
        }];

        const result = layer.getC3DTileFeatureFromIntersectsArray(intersects);
        assert.ok(result);
        assert.equal(result.batchId, 1);
    });
});
