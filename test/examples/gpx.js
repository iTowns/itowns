const assert = require('assert');

describe('gpx', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/gpx.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
