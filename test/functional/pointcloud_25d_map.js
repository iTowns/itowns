const assert = require('assert');

describe('pointcloud_25d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/pointcloud_25d_map.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
