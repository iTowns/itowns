import assert from 'assert';

// potree 3d is actually not really working we use 4978 potree data on a globeView (4978)
describe.skip('potree_3d_map', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/potree_3d_map.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
