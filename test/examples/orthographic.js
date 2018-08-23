const assert = require('assert');

describe('orthographic', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/orthographic.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
