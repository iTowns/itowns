import assert from 'assert';

describe('source_file_geojson_raster', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_file_geojson_raster.html', this.fullTitle());
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
        assert.equal(2, features.length);
    });

    it('should pick feature from Layer with SourceFile', async () => {
        const pickedFeatures = await page.evaluate(() => {
            /* global itowns */
            const precision = view.getPixelsToDegrees(5);
            const geoCoord = new itowns.Coordinates('EPSG:4326', 1.41955, 42.88613, 0);
            const promises = [];
            const layers = view.getLayers(l => l.source && l.source.isFileSource);
            for (let i = 0; i < layers.length; i++) {
                promises.push(
                    layers[i].source.loadData({}, { crs: 'EPSG:4326', buildExtent: false })
                        .then(fc => itowns.FeaturesUtils.filterFeaturesUnderCoordinate(geoCoord, fc, precision)),
                );
            }
            return Promise.all(promises);
        });

        assert.equal(pickedFeatures.length, 2);// 2 layers added
        assert.equal(pickedFeatures[0].length, 1, 'feature(s) picked on first layer');
        assert.equal(pickedFeatures[1].length, 0, 'feature(s) picked on second layer');
        assert.equal(pickedFeatures[0][0].geometry.properties.nom, 'Ariège');
    });
});
