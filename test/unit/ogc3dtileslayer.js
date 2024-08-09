import assert from 'assert';
import OGC3DTilesSource from 'Source/OGC3DTilesSource';
import OGC3DTilesLayer from 'Layer/OGC3DTilesLayer';

describe('OGC3DTilesLayer', function () {
    const config = {
        source: new OGC3DTilesSource({ url: 'https://mock.com/tileset.json' }),
    };

    it('should create 3D Tiles layer', function () {
        const ogc3DTilesLayer = new OGC3DTilesLayer('ogc3DTiles', config);
        assert.ok(ogc3DTilesLayer);
    });
});
