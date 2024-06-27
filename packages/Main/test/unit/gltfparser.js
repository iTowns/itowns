import assert from 'assert';
import fs from 'fs';
import GLTFParser from 'Parser/GLTFParser';

const glb = fs.readFileSync('./test/data/gltf/box.glb');
const glbArrayBuffer = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);

if (typeof atob === 'undefined') {
    global.atob = b64Encoded => Buffer.from(b64Encoded, 'base64').toString('binary');
}

describe('GLTFParser', function () {
    it('should load gltf', function (done) {
        GLTFParser.parse(glbArrayBuffer, './test/data/gltf/').then((result) => {
            assert.ok(result.scene);
            done();
        }).catch(done);
    });
});
