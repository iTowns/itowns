import assert from 'assert';

describe('3dtiles_pointcloud', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/3dtiles_pointcloud.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should load 3d tile layer', async () => {
        const exist = await page.evaluate(
            () => view.getLayerById('3d-tiles-sete') != null,
        );

        assert.ok(exist);
    });

    it('should load points', async () => {
        const objects = await page.evaluate(
            () => {
                const res = [];
                if (view.scene) {
                    const objects3d = view.scene;
                    objects3d.traverse((obj) => {
                        if (obj.isPoints) {
                            if (obj.layer) {
                                res.push(obj.layer.id);
                            }
                        }
                    });
                }
                return res;
            });
        assert.ok(objects.indexOf('3d-tiles-sete') >= 0);
    });

    it('Add 3dtiles layer with batch table', async () => {
        const batchLength = await page.evaluate(
            () => view.getLayerById('3d-tiles-sete').root.batchTable.batchLength,
        );
        assert.equal(batchLength, 1858);
    });
});
