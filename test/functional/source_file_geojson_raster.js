const assert = require('assert');

describe('source_file_geojson_raster', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_file_geojson_raster.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should pick feature from Layer with SourceFile', async () => {
        const pickFeatureCount = await page.evaluate(() => {
            const precision = view.getPixelsToDegrees(5);
            const layers = view.getLayers(l => l.source && l.source.isFileSource);
            const geoCoord = new itowns.Coordinates('EPSG:4326', 1.41955, 42.88613, 0);
            for (let i = 0; i < layers.length; i++) {
                const p = itowns.FeaturesUtils.filterFeaturesUnderCoordinate(
                    geoCoord, layers[i].source.parsedData, precision,
                );
                if (p.length) {
                    return Promise.resolve(p.length);
                }
            }

            return 0;
        });

        assert.equal(1, pickFeatureCount);
    });
});
