const assert = require('assert');

describe('split', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/split.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
