/* global browser, exampleCanRenderTest, itownsPort */
const assert = require('assert');

describe('3dtiles', () => {
    it('should run', async function _() {
        const page = await browser.newPage();

        page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/3dtiles.html`);
        await page.waitFor('#viewerDiv > canvas');

        const result = await exampleCanRenderTest(page, this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });


    it('should return the dragon and the globe', async function _() {
        const page = await browser.newPage();

        page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/3dtiles.html`);
        await page.waitFor('#viewerDiv > canvas');

        await exampleCanRenderTest(page, this.test.fullTitle());

        const layers = await page.evaluate(
            () => view.pickObjectsAt({ x: 195, y: 146 }).map(p => p.layer.id));

        assert.ok(layers.indexOf('globe') >= 0);
        assert.ok(layers.indexOf('3d-tiles-discrete-lod') >= 0);
        assert.equal(layers.indexOf('3d-tiles-request-volume'), -1);
        await page.close();
    });

    it('should return points', async function _() {
        const page = await browser.newPage();

        page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/3dtiles.html`);
        await page.waitFor('#viewerDiv > canvas');

        await exampleCanRenderTest(page, this.test.fullTitle());

        await page.evaluate(() => d.zoom());

        const pickingCount = await page.evaluate(() =>
            new Promise((resolve) => {
                view.mainLoop.addEventListener('command-queue-empty', () => {
                    if (view.mainLoop.renderingState === 0) {
                        resolve(view.pickObjectsAt(
                            { x: 200, y: 150 },
                            1,
                            '3d-tiles-request-volume').length);
                    }
                });
                view.notifyChange(undefined, false);
            }));
        assert.ok(pickingCount > 0);
        await page.close();
    });
});
