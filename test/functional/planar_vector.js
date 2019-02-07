const assert = require('assert');

describe('planar_vector', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/planar_vector.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
