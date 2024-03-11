const assert = require('assert');

describe('misc_colorlayer_visibility', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/misc_colorlayer_visibility.html', this.fullTitle());
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
        result = await page.evaluate(() => {
            const layers = view.tileLayer.info.displayed.layers.filter(l => l.isColorLayer);
            return { count: layers.length, id: layers[0].id };
        });
        assert.equal(result.count, 1);
        assert.equal(result.id, 'Ortho');
    });
});
