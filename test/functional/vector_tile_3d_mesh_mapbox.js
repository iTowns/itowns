import assert from 'assert';

describe('vector_tile_3d_mesh_mapbox', function _describe() {
    let result;
    before(async () => {
        result = await loadExample('examples/vector_tile_3d_mesh_mapbox.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should correctly load building features on a given TMS tile', async function _it() {
        const featuresCollection = await page.evaluate(async function _() {
            const layers = view.getLayers(l => l.source && l.source.isVectorSource);
            const res = await layers[0].source.loadData({ zoom: 15, row: 11634, col: 16859 }, { crs: 'EPSG:4978', source: { crs: 'EPSG:3857' } });
            return res;
        });
        assert.ok(featuresCollection.isFeatureCollection);
        const features = featuresCollection.features;
        assert.equal(features.length, 1);
        assert.equal(features[0].type, 2);// should be polygons
        assert.equal(features[0].id, 'building');
        assert.ok(features[0].geometries.length > 0);// should have at least 1 geometry
    });
});
