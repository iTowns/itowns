const assert = require('assert');

describe('collada', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/collada.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
