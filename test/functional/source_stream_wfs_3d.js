const assert = require('assert');

describe('source_stream_wfs_3d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_stream_wfs_3d.html', this.fullTitle());
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
