import assert from 'assert';

describe('source_file_kml_raster', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_file_kml_raster.html', this.fullTitle());
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
    });

    it('should pick feature from Layer with SourceFile', async () => {
        const pickedFeatures = await page.evaluate(() => {
            /* global itowns */
            const precision = view.getPixelsToDegrees(5);
            const geoCoord = new itowns.Coordinates('EPSG:4326', 6.80665, 45.91308, 0);
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

        assert.equal(pickedFeatures.length, 2);// layer and the LabelLayer
        assert.equal(pickedFeatures[0].length, 1);// only 1 feature picked on layer
        assert.equal(pickedFeatures[1].length, 1);// and 1 on lableLayer
        assert.equal(pickedFeatures[0][0].geometry.properties.description, pickedFeatures[1][0].geometry.properties.description, 'same feature');
        assert.equal(pickedFeatures[0][0].geometry.properties.description, 'Zone Aiguillette des Houches');
    });
});
