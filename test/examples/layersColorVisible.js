const assert = require('assert');

describe('layersColorVisible', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/layersColorVisible.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
