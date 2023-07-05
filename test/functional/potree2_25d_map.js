import assert from 'assert';

describe('potree2_25d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/potree2_25d_map.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
