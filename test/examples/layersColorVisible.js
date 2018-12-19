const assert = require('assert');

describe('layersColorVisible', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/layersColorVisible.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should display correct count of tiles', async () => {
        // test displayed tile
        const count = await page.evaluate(() => view.tileLayer.info.displayed.tiles.size);
        assert.equal(count, 20);
    });

    it('should display correct color layer', async () => {
        // test displayed tile
        const layer = await page.evaluate(() => view.tileLayer.info.displayed.layers[0].id);
        const count = await page.evaluate(() => view.tileLayer.info.displayed.layers.filter(l => l.type === 'color').length);
        assert.equal(count, 1);
        assert.equal(layer, 'Ortho');
    });
});
