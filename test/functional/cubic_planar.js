const assert = require('assert');

describe('cubic_planar', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/cubic_planar.html`, this.fullTitle());
    });

    it('should run', async () => {
        // This test hangs up one time out of three, so retry it 2 times
        // this.retries(2);
        assert.ok(result);
    });
});
