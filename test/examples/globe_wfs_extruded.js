const assert = require('assert');

describe('globe_wfs_extruded', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/globe_wfs_extruded.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
    it('should remove GeometryLayer', async () => {
        const countGeometryLayerStart = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        await page.evaluate(() => view.removeLayer('WFS Bus lines'));
        const countGeometryLayerEnd = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        assert.ok(countGeometryLayerStart - countGeometryLayerEnd === 1);
    });
});
