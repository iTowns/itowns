const assert = require('assert');

describe('globe', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/globe.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should return the correct tile', async () => {
        const level = await page.evaluate(() => view.pickObjectsAt(
            { x: 221, y: 119 },
        )[0].object.level);

        assert.equal(2, level);
    });
    it('should not add layer with id already used', async () => {
        const error = await page.evaluate(() => itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(view.addLayer).catch(() => true));
        const colorLayersCount = await page.evaluate(() => view.getLayers(l => l.type === 'color').length);

        assert.ok(error && colorLayersCount === 1);
    });
    it('should not add layers beyond the capabilities', async () => {
        const maxColorSamplerUnitsCount = await page
            .evaluate(type => view.tileLayer.level0Nodes[0]
                .material.textures[type].length, 1);
        const colorSamplerUnitsCount = await page.evaluate(() => view.tileLayer.countColorLayersTextures(view.getLayers(l => l.type === 'color')[0]));
        const limit = maxColorSamplerUnitsCount - colorSamplerUnitsCount;

        // add layers just below the capacity limit
        const underLimit = await page.evaluate(maxLayersCount => itowns.Fetcher.json('./layers/JSONLayers/OrthosCRS.json').then((params) => {
            const promises = [];
            for (let i = 0; i < maxLayersCount; i++) {
                const layerParams = Object.assign({}, params);
                layerParams.id = `${layerParams.id}_${i}`;
                promises.push(view.addLayer(layerParams));
            }
            return Promise.all(promises).then(() => true).catch(() => false);
        }), limit);

        // add one layer just over the capacity limit
        // verify if the error is handled
        const errorOverLimit = await page.evaluate(() => itowns.Fetcher.json('./layers/JSONLayers/OrthosCRS.json').then((params) => {
            const layerParams = Object.assign({}, params);
            layerParams.id = 'max';
            return view.addLayer(layerParams).then(() => false).catch(() => true);
        }));

        assert.ok(underLimit);
        assert.ok(errorOverLimit);
    });
});
