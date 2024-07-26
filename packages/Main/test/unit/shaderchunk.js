import assert from 'assert';
import * as THREE from 'three';
import ShaderChunk from 'Renderer/Shader/ShaderChunk';

describe('ShaderChunk', function () {
    it('should install correctly the chunks', () => {
        assert.ok(THREE.ShaderChunk['itowns/pitUV']);
        assert.ok(THREE.ShaderChunk['itowns/precision_qualifier']);
    });

    it('should add a chunk', () => {
        ShaderChunk.install(THREE.ShaderChunk, { unit_test: '#define TEST' }, 'itowns/');
        assert.ok(THREE.ShaderChunk['itowns/unit_test']);
    });
});
