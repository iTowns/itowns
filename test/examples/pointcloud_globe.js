/* global browser, exampleCanRenderTest, itownsPort */
const assert = require('assert');

describe('pointcloud_globe', () => {
    it('should run', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/pointcloud_globe.html`);
        await page.waitFor('#viewerDiv > canvas');

        const result = await exampleCanRenderTest(page, this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
