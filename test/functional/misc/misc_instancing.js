import assert from 'assert';

describe('misc_instancing', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/misc_instancing.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should load the trees and lights objects', async () => {
        const objects = await page.evaluate(
            () => {
                const res = [];
                if (view.scene) {
                    const objects3d = view.scene;
                    objects3d.traverse((obj) => {
                        if (obj.isInstancedMesh) {
                            if (obj.parent && obj.parent.layer) {
                                res.push(obj.parent.layer.name);
                            }
                        }
                    });
                }
                return res;
            });
        assert.ok(objects.indexOf('lights') >= 0);
        assert.ok(objects.indexOf('trees') >= 0);
    });
});
