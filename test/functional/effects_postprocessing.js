const assert = require('assert');

describe('effects_postprocessing', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/effects_postprocessing.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
