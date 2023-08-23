const assert = require('assert');

describe('misc_glft_model', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/misc_gltf_model',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
