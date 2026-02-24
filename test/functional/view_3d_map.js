import assert from 'assert';

describe('view_3d_map', function _() {
    let result;
    before(async () => {
        await enableGLForTest();
        result = await loadExample('examples/view_3d_map.html', this.fullTitle());
    });

    after(async () => {
        disableGLForTest();
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should return the correct tile', async () => {
        const candidates = [
            { x: 221, y: 119 },
            { x: 210, y: 110 },
            { x: 230, y: 110 },
            { x: 210, y: 130 },
            { x: 230, y: 130 },
            { x: 200, y: 120 },
            { x: 240, y: 120 },
        ];
        const pickResult = await page.evaluate((cands) => {
            const getFirst = picks => (picks.length ? picks[0] : undefined);
            let chosen = null;
            let picks = [];
            const candidateStats = [];
            cands.some((c) => {
                picks = view.pickObjectsAt(c, 5);
                const first = getFirst(picks);
                candidateStats.push({
                    candidate: c,
                    picksLength: picks.length,
                    firstLevel: first && first.object ? first.object.level : null,
                    firstLayer: first && first.layer ? first.layer.id : null,
                });
                if (picks.length > 0) {
                    chosen = c;
                    return true;
                }
                return false;
            });
            const displayed = (view.tileLayer && view.tileLayer.info && view.tileLayer.info.displayed && view.tileLayer.info.displayed.tiles)
                ? [...view.tileLayer.info.displayed.tiles].length : null;
            const transform = itowns.CameraUtils.getTransformCameraLookingAtTarget(view, view.camera3D);
            const first = getFirst(picks);
            return {
                chosen,
                picksLength: picks.length,
                level: first && first.object ? first.object.level : null,
                firstPickShape: first ? {
                    hasObject: !!first.object,
                    objectLevel: first && first.object ? first.object.level : null,
                    objectType: first && first.object ? first.object.type : null,
                    layerId: first && first.layer ? first.layer.id : null,
                } : null,
                renderingState: view.mainLoop ? view.mainLoop.renderingState : null,
                commandsWaiting: view.mainLoop && view.mainLoop.scheduler ? view.mainLoop.scheduler.commandsWaitingExecutionCount() : null,
                displayedTilesCount: displayed,
                candidateStats,
                windowSize: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
                camera: { heading: transform.heading, tilt: transform.tilt, range: transform.range },
            };
        }, candidates);
        const level = pickResult.level;

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
        const colorSamplerUnitsCount = await page.evaluate(() => view.getLayers(l => l.isColorLayer).length);
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
