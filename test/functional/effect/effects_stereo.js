const assert = require('assert');

describe('effects_stereo', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/effects_stereo.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
