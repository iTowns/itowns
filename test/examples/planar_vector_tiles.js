/* global browser, itownsPort */
const assert = require('assert');

describe('planar_vector_tiles', () => {
    it('should run', async function _() {
        const page = await browser.newPage();

        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/planar_vector_tiles.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
