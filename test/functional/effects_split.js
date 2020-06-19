const assert = require('assert');

describe('effects_split', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/effects_split.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
