import assert from 'assert';

describe('3dtiles_ion', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/3dtiles_ion.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should pick the globe', async () => {
        const layers = await page.evaluate(
            () => view.pickObjectsAt({ x: 195, y: 146 }).map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('globe') >= 0);
    });

    it('should pick a building from 3D', async () => {
        await page.evaluate(() => {
            const lyonExtent = new itowns.Extent('EPSG:4326', 4.85, 4.9, 45.75, 45.77);
            itowns.CameraUtils.transformCameraToLookAtTarget(view, view.camera3D, lyonExtent);
        });
        await waitUntilItownsIsIdle(this.fullTitle());
        const layers = await page.evaluate(
            () => view.pickObjectsAt({
                x: 166,
                y: 65,
            })
                .map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('3d-tiles-cesium-ion') >= 0);
    });
});
