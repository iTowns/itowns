/* global browser, exampleCanRenderTest, itownsPort */
const assert = require('assert');

describe('wfs', () => {
    it('should run', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/wfs.html`);
        await page.waitFor('#viewerDiv > canvas');

        const result = await exampleCanRenderTest(page, this.test.fullTitle());

        assert.ok(result);
    });

    it('should pick the correct building', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/wfs.html`);
        await page.waitFor('#viewerDiv > canvas');

        await exampleCanRenderTest(page, this.test.fullTitle());

        // test picking
        const buildingId = await page.evaluate(() => picking({ x: 342, y: 243 }).properties.id);
        assert.equal(buildingId, 'bati_indifferencie.5751442');
        await page.close();
    });
});
