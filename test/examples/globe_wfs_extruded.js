const assert = require('assert');

describe('globe_wfs_extruded', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/globe_wfs_extruded.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
