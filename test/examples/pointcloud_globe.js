/* global browser, itownsPort */
const assert = require('assert');

describe('pointcloud_globe', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/pointcloud_globe.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
