const assert = require('assert');

describe('pointcloud', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/pointcloud.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
