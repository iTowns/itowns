import assert from 'assert';
import fs from 'fs';
import { glTFLoader } from 'Parser/B3dmParser';

const gltf = fs.readFileSync('./test/data/gltf/Box.gltf');

if (typeof atob === 'undefined') {
    global.atob = b64Encoded => Buffer.from(b64Encoded, 'base64').toString('binary');
}

describe('gltfLoader', function () {
    it('should load gltf', function () {
        glTFLoader.parse(gltf, '../data/gltf/Box.gltf', (result) => {
            assert.ok(result.scene);
        });
    });
});
