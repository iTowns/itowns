/* global browser, itownsPort */
const assert = require('assert');

describe('wfs', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/wfs.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });

    it('should pick the correct building', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/wfs.html`,
            this.test.fullTitle());

        // test picking
        const buildingId = await page.evaluate(() => picking({ x: 342, y: 243 }).properties.id);
        assert.equal(buildingId, 'bati_indifferencie.5751442');
        await page.close();
    });
});
