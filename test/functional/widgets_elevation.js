const assert = require('assert');

describe('widgets_elevation', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/widgets_elevation.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });
});
