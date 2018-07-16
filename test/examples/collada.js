/* global browser, itownsPort */
const assert = require('assert');

describe('collada', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/collada.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
