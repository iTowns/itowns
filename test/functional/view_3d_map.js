import assert from 'assert';

describe('view_3d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/view_3d_map.html', this.fullTitle());
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

    it('should subdivise globe correctly', async () => {
        const displayedTiles = await page.evaluate(() => {
            r = {};
            [...view.tileLayer.info.displayed.tiles]
            // eslint-disable-next-line
                .forEach(t => (!r[t.level] ? r[t.level] = 1 : r[t.level]++));
            return r;
        });
        assert.equal(displayedTiles['2'], 20);
    });

    it('should not add layer with id already used', async () => {
        const error = await page.evaluate(() => itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(view.addLayer).catch(() => true));
        const colorLayersCount = await page.evaluate(() => view.getLayers(l => l.isColorLayer).length);

        assert.ok(error && colorLayersCount === 1);
    });
    it('should not add layers beyond the capabilities', async () => {
        const maxColorSamplerUnitsCount = await page.evaluate(
            () => itowns.getMaxColorSamplerUnitsCount(),
        );
        const colorSamplerUnitsCount = await page.evaluate(() => view.tileLayer.countColorLayersTextures(view.getLayers(l => l.isColorLayer)[0]));
        const limit = maxColorSamplerUnitsCount - colorSamplerUnitsCount;

        // add layers just below the capacity limit
        const underLimit = await page.evaluate(maxLayersCount => itowns.Fetcher.json('./layers/JSONLayers/OPENSM.json').then((params) => {
            // eslint-disable-next-line no-param-reassign
            params.source = new itowns.TMSSource(params.source);
            const promises = [];
            for (let i = 0; i < maxLayersCount; i++) {
                const layer = new itowns.ColorLayer(`${params.id}_${i}`, params);
                promises.push(view.addLayer(layer));
            }
            return Promise.all(promises).then(() => true).catch(() => false);
        }), limit);

        // add one layer just over the capacity limit
        // verify if the error is handled
        const errorOverLimit = await page.evaluate(() => itowns.Fetcher.json('./layers/JSONLayers/OPENSM.json').then((params) => {
            const layerParams = Object.assign({}, params);
            layerParams.id = 'max';
            return view.addLayer(layerParams).then(() => false).catch(() => true);
        }));

        assert.ok(underLimit);
        assert.ok(errorOverLimit);
    });
    it('should remove color Layer', async () => {
        const colorLayersCountStart = await page.evaluate(() => view.getLayers(l => l.isColorLayer).length);
        await page.evaluate(() => view.removeLayer('Ortho'));
        const colorLayersCountEnd = await page.evaluate(() => view.getLayers(l => l.isColorLayer).length);
        assert.ok(colorLayersCountStart - colorLayersCountEnd === 1);
    });
    it('should remove elevation Layers', async () => {
        await page.evaluate(() => view.removeLayer('MNT_WORLD_SRTM3'));
        await page.evaluate(() => view.removeLayer('IGN_MNT_HIGHRES'));
        const elevationLayersCount = await page.evaluate(() => view.getLayers(l => l.isElevationLayer).length);
        assert.ok(elevationLayersCount === 0);
    });
});
