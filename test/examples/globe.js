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
    it('should not add layers beyond the capabilities', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/globe.html`,
            this.test.fullTitle());

        const maxColorSamplerUnitsCount = await page
            .evaluate(type => globeView.tileLayer.level0Nodes[0]
                .material.textures[type].length, 1);
        const colorSamplerUnitsCount = await page.evaluate(() =>
                globeView.tileLayer.countColorLayersTextures(globeView.getLayers(l => l.type === 'color')[0]));
        const limit = maxColorSamplerUnitsCount - colorSamplerUnitsCount;

        // add layers just below the capacity limit
        const underLimit = await page.evaluate(maxLayersCount =>
            itowns.Fetcher.json('./layers/JSONLayers/OrthosCRS.json').then((params) => {
                const promises = [];
                for (let i = 0; i < maxLayersCount; i++) {
                    const layerParams = Object.assign({}, params);
                    layerParams.id = `${layerParams.id}_${i}`;
                    promises.push(globeView.addLayer(layerParams));
                }
                return Promise.all(promises).then(() => true).catch(() => false);
            }), limit);

        // add one layer just over the capacity limit
        // verify if the error is handled
        const errorOverLimit = await page.evaluate(() =>
            itowns.Fetcher.json('./layers/JSONLayers/OrthosCRS.json').then((params) => {
                const layerParams = Object.assign({}, params);
                layerParams.id = 'max';
                return globeView.addLayer(layerParams).then(() => false).catch(() => true);
            }));

        assert.ok(underLimit);
        assert.ok(errorOverLimit);
        await page.close();
    });
    it('should not add layer with id already used', async function _() {
        const page = await browser.newPage();

        await loadExample(page,
            `http://localhost:${itownsPort}/examples/globe.html`,
            this.test.fullTitle());

        const error = await page.evaluate(() => itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(globeView.addLayer).catch(() => true));
        const colorLayersCount = await page.evaluate(() => globeView.getLayers(l => l.type === 'color').length);

        assert.ok(error && colorLayersCount === 1);
        page.close();
        await page.close();
    });
});
