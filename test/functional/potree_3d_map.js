const assert = require('assert');

describe('potree_3d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/potree_3d_map.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
