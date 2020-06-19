const assert = require('assert');

describe('misc_collada', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/misc_collada.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
