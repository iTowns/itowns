const assert = require('assert');

describe('globe_vector', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/globe_vector.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
