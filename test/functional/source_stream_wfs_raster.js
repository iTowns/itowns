const assert = require('assert');

describe('source_stream_wfs_raster', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_stream_wfs_raster.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
