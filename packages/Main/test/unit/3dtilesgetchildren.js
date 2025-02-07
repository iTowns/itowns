import assert from 'assert';
import { Group, Mesh } from 'three';
import C3DTilesLayer from 'Layer/C3DTilesLayer';

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

        const result = C3DTilesLayer.prototype.getObjectToUpdateForAttachedLayers(tile);
        assert.ok(Array.isArray(result.elements));
        assert.ok(result.elements.length, 3);
    });
});
