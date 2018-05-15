/* global browser, exampleCanRenderTest, itownsPort */
const assert = require('assert');

describe('globe_vector', () => {
    it('should run', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/globe_vector.html`);
        await page.waitFor('#viewerDiv > canvas');

        const result = await exampleCanRenderTest(page, this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });

    it('should return the correct element', async function _() {
        const page = await browser.newPage();

        await page.setViewport({ width: 400, height: 300 });
        await page.goto(`http://localhost:${itownsPort}/examples/globe_vector.html`);
        await page.waitFor('#viewerDiv > canvas');

        await exampleCanRenderTest(page, this.test.fullTitle());

        const ariege = await page.evaluate(() => {
            const layer = globeView.getLayers(l => l.name === 'ariege');
            const position = globeView.controls.pickGeoPosition({ x: 118, y: 215 });
            const result = itowns.FeaturesUtils.filterFeaturesUnderCoordinate(position,
                layer[0].feature);

            return result[0].feature.properties.code;
        });

        assert.equal('09', ariege);
        page.close();
        await page.close();
    });
});
