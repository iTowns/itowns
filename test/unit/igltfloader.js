import assert from 'assert';
import fs from 'fs';
import iGLTFLoader from 'Parser/iGLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';

describe('iGLTFLoader', function () {
    const gltfLoader = new iGLTFLoader();

    const glb = fs.readFileSync('./test/data/gltf/box.glb');
    const glbArrayBuffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);

    const basicCallback = () => {};

    if (typeof atob === 'undefined') {
        global.atob = b64Encoded => Buffer.from(b64Encoded, 'base64').toString('binary');
    }

    it('should set draco loader', function () {
        const dracoLoader = new DRACOLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        assert.ok(gltfLoader.glTFLoader.dracoLoader);
    });

    it('should set ktx2 loader', function () {
        const ktx2Loader = new KTX2Loader();
        gltfLoader.setKTX2Loader(ktx2Loader);
        assert.ok(gltfLoader.glTFLoader.ktx2Loader);
    });

    it('should parse gltf', function () {
        const onLoad = (result) => {
            assert.ok(result.scene);
        };

        const onError = (e) => {
            assert.fail(e);
        };

        gltfLoader.parse(glbArrayBuffer, './test/data/gltf/', onLoad, onError);
    });

    it('should throw error if parsing undefined buffer or path', function () {
        let isErrorTriggered = false;

        try {
            gltfLoader.parse(
                undefined,
                './test/data/gltf/',
                () => {},
                (error) => {
                    isErrorTriggered = error === '[iGLTFLoader]: Buffer and path are mandatory to parse a glTF.';
                },
            );
        } catch { /* skip */ }
        assert.ok(isErrorTriggered);

        isErrorTriggered = false;
        try {
            gltfLoader.parse(
                glbArrayBuffer,
                undefined,
                () => {},
                (error) => {
                    isErrorTriggered = error === '[iGLTFLoader]: Buffer and path are mandatory to parse a glTF.';
                },
            );
        } catch { /* skip */ }
        assert.ok(isErrorTriggered);
    });

    it('should register callback', function () {
        gltfLoader.register(basicCallback);
        assert.ok(
            gltfLoader.glTFLoader.pluginCallbacks.includes(basicCallback),
        );
    });

    it('should unregister callback', function () {
        gltfLoader.unregister(basicCallback);
        assert.ok(
            !gltfLoader.glTFLoader.pluginCallbacks.includes(basicCallback),
        );
    });

    it('should set meshopt decoder', function () {
        const previousMeshoptDecoder = gltfLoader.glTFLoader.meshoptDecoder;
        gltfLoader.setMeshoptDecoder('mockedMeshoptDecoder');
        assert.equal(
            'mockedMeshoptDecoder',
            gltfLoader.glTFLoader.meshoptDecoder,
        );
        gltfLoader.setMeshoptDecoder(previousMeshoptDecoder);
    });
});
