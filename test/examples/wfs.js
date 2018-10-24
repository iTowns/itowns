const assert = require('assert');

describe('wfs', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/wfs.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should pick the correct building', async () => {
        // test picking
        const buildingId = await page.evaluate(() => picking({ x: 342, y: 243 }));
        assert.equal(buildingId.id, 'bati_indifferencie.5751442');
    });
});
