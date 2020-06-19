const assert = require('assert');

describe('source_file_gpx_3d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_file_gpx_3d.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
