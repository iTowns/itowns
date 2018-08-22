/* global browser, itownsPort */
const assert = require('assert');

describe('cubic_planar', () => {
    it('should run', async function _() {
        // This test hangs up one time out of three, so retry it 2 times
        this.retries(2);

        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/cubic_planar.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
});
