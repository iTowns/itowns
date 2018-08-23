const assert = require('assert');

describe('panorama', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/panorama.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
