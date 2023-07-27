const assert = require('assert');

describe('itowns_GLB', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/itowns_GLB.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
