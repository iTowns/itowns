const assert = require('assert');

describe('postprocessing', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/postprocessing.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
