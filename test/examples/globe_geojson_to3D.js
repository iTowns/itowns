/* global browser, itownsPort */
const assert = require('assert');

describe('globe geojson to3D', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/globe_geojson_to3D.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
