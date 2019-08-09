const assert = require('assert');

describe('misc_georeferenced_images', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/misc_georeferenced_images.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
