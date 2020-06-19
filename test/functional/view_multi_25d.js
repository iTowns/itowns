const assert = require('assert');

describe('view_multi_25d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/view_multi_25d.html', this.fullTitle());
    });

    it('should run', async () => {
        // This test hangs up one time out of three, so retry it 2 times
        // this.retries(2);
        assert.ok(result);
    });
});
