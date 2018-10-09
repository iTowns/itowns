/* global browser, itownsPort */
const assert = require('assert');

describe('multiglobe', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/multiglobe.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });

    it('zoom and check that the level is correct', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/multiglobe.html`);

        // press-space and zoom in
        await page.evaluate(() => {
            onKeyPress({ keyCode: 32 });
            for (let i = 0; i < 50; i++) {
                onMouseWheel({ detail: -1 });
            }
        });

        await waitUntilItownsIsIdle(page, this.test.fullTitle());

        // verify that we properly updated the globe
        const { layer, level } = await page.evaluate(() => {
            const pick = view.pickObjectsAt({ x: 200, y: 150 })[0];
            return {
                layer: pick.layer.id,
                level: pick.object.level,
            };
        });

        assert.equal('globe2', layer);
        assert.equal(8, level);
        await page.close();
    });
});
