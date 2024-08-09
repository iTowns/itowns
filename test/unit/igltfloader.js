import assert from 'assert';
import fs from 'fs';
import iGLTFLoader from 'Parser/iGLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';

describe('iGLTFLoader', function () {
    const gltfLoader = new iGLTFLoader();

    const glb = fs.readFileSync('./test/data/gltf/box.glb');
    const glbArrayBuffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);

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
});
