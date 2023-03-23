const assert = require('assert');

describe('underground_25d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/underground_25d_map.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should decrease opacity while zooming', async () => {
        const opacity0 = await page.evaluate(() => {
            let opacity;
            const layer = view.getLayers(l => l.isPlanarLayer)[0];
            if (layer) {
                opacity = layer.opacity;
            }
            return opacity;
        });

        await page.evaluate(() => view.setUndergroundVisualization(true));
        const params = { range: 1000 };
        await page.evaluate((p) => {
            const camera = view.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                view, camera, p,
            ).then();
        }, params);
        const opacity1 = await page.evaluate(() => {
            let opacity;
            const layer = view.getLayers(l => l.isPlanarLayer)[0];
            if (layer) {
                opacity = layer.opacity;
            }
            return opacity;
        });
        assert.ok(opacity0 !== undefined && opacity0 > 0);
        assert.ok(opacity1 < opacity0);
    });

    it('should restore opacity when disabled', async () => {
        const opacity0 = await page.evaluate(() => {
            let opacity;
            const layer = view.getLayers(l => l.isPlanarLayer)[0];
            if (layer) {
                opacity = layer.opacity;
            }
            return opacity;
        });
        await page.evaluate(() => view.setUndergroundVisualization(false));
        const opacity1 = await page.evaluate(() => {
            let opacity;
            const layer = view.getLayers(l => l.isPlanarLayer)[0];
            if (layer) {
                opacity = layer.opacity;
            }
            return opacity;
        });
        assert.ok(opacity1 > opacity0);
    });
});
