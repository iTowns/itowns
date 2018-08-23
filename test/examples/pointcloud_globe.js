const assert = require('assert');

describe('pointcloud_globe', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/pointcloud_globe.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
