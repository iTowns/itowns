const assert = require('assert');

describe('stereo', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/stereo.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
