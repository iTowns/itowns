const assert = require('assert');

describe('view_2d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/view_2d_map.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
