import assert from 'assert';
import { Group, Mesh } from 'three';
import { getObjectToUpdateForAttachedLayers } from 'Provider/3dTilesProvider';

describe('getObjectToUpdateForAttachedLayers', function () {
    it('should correctly return all children', function () {
        const layer = { };
        const tile = {
            content: new Group(),
            layer,
        };

        for (let i = 0; i < 3; i++) {
            const mesh = new Mesh();
            mesh.layer = layer;
            tile.content.add(mesh);
        }

        const result = getObjectToUpdateForAttachedLayers(tile);
        assert.ok(Array.isArray(result.elements));
        assert.ok(result.elements.length, 3);
    });
});
