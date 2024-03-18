import assert from 'assert';
import iGLTFLoader from 'src/Parser/iGLTFLoader';
import gltf from '../data/gltf/Box.gltf';

if (typeof atob === 'undefined') {
    global.atob = b64Encoded => Buffer.from(b64Encoded, 'base64').toString('binary');
}

describe('iGLTFLoader', function () {
    it('should load gltf', function () {
        iGLTFLoader.parse(gltf, '../data/gltf/', (result) => {
            assert.ok(result.scene);
        });
    });
});
