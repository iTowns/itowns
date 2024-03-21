import assert from 'assert';

describe('source_file_kml_raster_usgs', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_file_kml_raster_usgs.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('load features data', async () => {
        const features = await page.evaluate(() => {
            const promises = [];
            const layers = view.getLayers(l => l.source && l.source.isFileSource);
            for (let i = 0; i < layers.length; i++) {
                promises.push(layers[i].source.loadData({}, { crs: 'EPSG:4326' }));
            }

            return Promise.all(promises);
        });
        assert.equal(features.length, 2); // the layer and the LabelLayer
        assert.equal(features[0].uuid, features[1].uuid);
        assert.equal(features[0].features.length, 1);
        assert.equal(features[0].features[0].type, 0);
    });
});
