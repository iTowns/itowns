/* global browser, itownsPort */
const assert = require('assert');

describe('orthographic', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/orthographic.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
