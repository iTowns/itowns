const assert = require('assert');

describe('vector_tile_raster_2d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/vector_tile_raster_2d.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
