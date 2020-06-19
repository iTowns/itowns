const assert = require('assert');

describe('3dtiles_basic', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/3dtiles_basic.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should return the dragon and the globe', async () => {
        const layers = await page.evaluate(
            () => view.pickObjectsAt({ x: 195, y: 146 }).map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('globe') >= 0);
        assert.ok(layers.indexOf('3d-tiles-discrete-lod') >= 0);
        assert.equal(layers.indexOf('3d-tiles-request-volume'), -1);
    });

    it('should return points', async function __() {
        // click on the 'goto pointcloud' button
        await page.evaluate(() => d.zoom());

        await waitUntilItownsIsIdle(this.test.fullTitle());

        const pickingCount = await page.evaluate(() => view.pickObjectsAt(
            { x: 200, y: 150 },
            1,
            '3d-tiles-request-volume',
        ).length);
        assert.ok(pickingCount > 0);
    });

    it('should remove GeometryLayer', async () => {
        const countGeometryLayerStart = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        const attachedGeometricLayerCount = await page.evaluate(() => {
            const attachedLayers = view.getLayerById('3d-tiles-discrete-lod').attachedLayers.filter(l => l.isGeometryLayer);
            return attachedLayers.length;
        });
        await page.evaluate(() => view.removeLayer('3d-tiles-discrete-lod'));
        const countGeometryLayerEnd = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        // the attached GeometryLayers are, also, removed.
        assert.equal(countGeometryLayerStart - countGeometryLayerEnd, 1 + attachedGeometricLayerCount);
    });
});
