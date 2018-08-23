const assert = require('assert');

describe('globe geojson to3D', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/globe_geojson_to3D.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
