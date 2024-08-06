import assert from 'assert';
import fs from 'fs';
import iGLTFLoader from 'Parser/iGLTFLoader';

describe('iGLTFLoader', function () {

    const gltfLoader = new iGLTFLoader();

    const glb = fs.readFileSync('./test/data/gltf/box.glb');
    const glbArrayBuffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);

    if (typeof atob === 'undefined') {
        global.atob = b64Encoded => Buffer.from(b64Encoded, 'base64').toString('binary');
    }

    it('should load gltf', function () {
        const onLoad = (result) => {
            assert.ok(result.scene);
        };

        const onError = (e) => {
            assert.fail(e);
        };

        gltfLoader.parse(glbArrayBuffer, './test/data/gltf/', onLoad, onError);
    });
});
