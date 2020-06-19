const assert = require('assert');

describe('vector_tile_raster_3d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/vector_tile_raster_3d.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
