/* global browser, itownsPort */
const assert = require('assert');

describe('oriented_images', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/oriented_images.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
