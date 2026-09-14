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
        const data = await page.evaluate(async function _() {
            const layers = view.getLayers(l => l.source && l.source.isVectorSource);
            const col = await layers[0].source.loadData(
                { zoom: 15, row: 11634, col: 16859 },
                { crs: 'EPSG:4978', source: { crs: 'EPSG:3857' } },
            );
            // Extract primitives only: FeatureCollection extends THREE.Object3D
            // and cannot cross the browser→Node boundary (circular parent/children refs).
            const f = col?.features?.[0];
            return {
                isFeatureCollection: col?.isFeatureCollection,
                featuresLength: col?.features?.length,
                featureType: f?.type,
                featureId: f?.id,
                geometriesLength: f?.geometries?.length,
            };
        });
        assert.ok(data.isFeatureCollection);
        const { featuresLength, featureType, featureId, geometriesLength } = data;
        assert.equal(featuresLength, 1);
        assert.equal(featureType, 2);// should be polygons
        assert.equal(featureId, 'building');
        assert.ok(geometriesLength > 0);// should have at least 1 geometry
    });
});
