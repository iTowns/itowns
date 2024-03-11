const assert = require('assert');

describe('3dtiles_25d', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/3dtiles_25d.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should pick the planar layer', async () => {
        const layers = await page.evaluate(
            () => view.pickObjectsAt({
                x: 194,
                y: 100,
            })
                .map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('planar') >= 0);
    });
});
