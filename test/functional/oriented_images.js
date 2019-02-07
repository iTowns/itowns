const assert = require('assert');

describe('oriented_images', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/oriented_images.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
