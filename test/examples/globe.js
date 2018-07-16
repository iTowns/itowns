/* global browser, itownsPort */
const assert = require('assert');

describe('globe', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/globe.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });

    it('should return the correct tile', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/globe.html`,
            this.test.fullTitle());

        const level = await page.evaluate(() =>
            globeView.pickObjectsAt(
                { x: 221, y: 119 })[0].object.level);

        assert.equal(2, level);
        await page.close();
    });
});
