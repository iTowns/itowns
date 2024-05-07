import assert from 'assert';

describe('Widget C3dTilesStyle', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/widgets_3dtiles_style.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
