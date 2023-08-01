const assert = require('assert');

describe('copc_simple_loader', function _() {
    let result;

    before(async () => {
        result = await loadExample(
            'examples/copc_simple_loader.html',
            this.fullTitle(),
        );
    });

    it('sould run', async () => {
        assert.ok(result);
    });
});
