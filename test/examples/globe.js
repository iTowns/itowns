/* global browser, exampleCanRenderTest, itownsPort */
const assert = require('assert');

describe('globe', () => {
    it('should run', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/globe.html`);
        await page.waitFor('#viewerDiv > canvas');

        const result = await exampleCanRenderTest(page, this.test.fullTitle());

        assert.ok(result);
        page.close();
        await page.close();
    });

    it('should return the correct tile', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/globe.html`);
        await page.waitFor('#viewerDiv > canvas');

        await exampleCanRenderTest(page, this.test.fullTitle());

        const level = await page.evaluate(() =>
            globeView.pickObjectsAt(
                { x: 221, y: 119 })[0].object.level);

        assert.equal(2, level);
        page.close();
        await page.close();
    });
});
