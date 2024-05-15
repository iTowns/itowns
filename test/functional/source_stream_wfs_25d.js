import assert from 'assert';

describe('source_stream_wfs_25d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_stream_wfs_25d.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should pick the correct building', async () => {
        // Test picking a feature geometry property from `wfsBuilding` layer.
        // Picking is done at the given screen coordinates.
        const buildingId = await page.evaluate(() => picking({ x: 97, y: 213 }));
        assert.ok(buildingId, 'no buildings picked');
        assert.equal(buildingId.cleabs, 'BATIMENT0000000241634062');
    });
    it('should remove GeometryLayer', async () => {
        const countGeometryLayerStart = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        await page.evaluate(() => view.removeLayer('lyon_tcl_bus'));
        const countGeometryLayerEnd = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        assert.ok(countGeometryLayerStart - countGeometryLayerEnd === 1);
    });
});
