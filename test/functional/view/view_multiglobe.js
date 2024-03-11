const assert = require('assert');

describe('view_multiglobe', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/view_multiglobe.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('zoom and check that the level is correct', async function __() {
        // press-space and zoom in
        await page.evaluate(() => {
            onKeyPress({ keyCode: 32 });
            for (let i = 0; i < 50; i++) {
                onMouseWheel({ detail: -1 });
            }
        });

        await waitUntilItownsIsIdle(this.test.fullTitle());

        // verify that we properly updated the globe
        const { layer, level } = await page.evaluate(() => {
            const pick = view.pickObjectsAt({ x: 200, y: 150 })[0];
            console.log('pick', pick);
            return {
                layer: pick.layer.id,
                level: pick.object.level,
            };
        });

        assert.equal('globe2', layer);
        assert.equal(8, level);
    });
});
