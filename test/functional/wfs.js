const assert = require('assert');

describe('wfs', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/wfs.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should pick the correct building', async () => {
        // test picking
        const buildingId = await page.evaluate(() => picking({ x: 342, y: 243 }));
        assert.equal(buildingId.id, 'bati_indifferencie.5265944');
    });
    it('should remove GeometryLayer', async () => {
        const countGeometryLayerStart = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        await page.evaluate(() => view.removeLayer('lyon_tcl_bus'));
        const countGeometryLayerEnd = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        assert.ok(countGeometryLayerStart - countGeometryLayerEnd === 1);
    });
});
