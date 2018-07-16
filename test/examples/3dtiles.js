/* global browser, itownsPort */
const assert = require('assert');

describe('3dtiles', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/3dtiles.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });


    it('should return the dragon and the globe', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/3dtiles.html`,
            this.test.fullTitle());

        const layers = await page.evaluate(
            () => view.pickObjectsAt({ x: 195, y: 146 }).map(p => p.layer.id));

        assert.ok(layers.indexOf('globe') >= 0);
        assert.ok(layers.indexOf('3d-tiles-discrete-lod') >= 0);
        assert.equal(layers.indexOf('3d-tiles-request-volume'), -1);
        await page.close();
    });

    it('should return points', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/3dtiles.html`);

        // click on the 'goto pointcloud' button
        await page.evaluate(() => d.zoom());

        await waitUntilItownsIsIdle(page, this.test.fullTitle());

        const pickingCount = await page.evaluate(() =>
            view.pickObjectsAt(
                { x: 200, y: 150 },
                1,
                '3d-tiles-request-volume').length);
        assert.ok(pickingCount > 0);
        await page.close();
    });
});
