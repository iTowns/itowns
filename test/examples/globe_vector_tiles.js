/* global browser, itownsPort */
const assert = require('assert');

describe('globe_vector_tiles', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/globe_vector_tiles.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
