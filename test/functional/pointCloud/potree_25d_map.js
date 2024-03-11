const assert = require('assert');

describe('potree_25d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/potree_25d_map.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
