const assert = require('assert');

describe('planar_3dtiles', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            `http://localhost:${itownsPort}/examples/planar_3dtiles.html`,
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

    it('should pick the correct building for 2012', async () => {
        // Picks the object at (248,87) and verifies that its batch id is
        // 31 (corresponds to the Incity tower of Lyon)
        const batchID = await page.evaluate(() => {
            const intersects = view.pickObjectsAt({
                x: 248,
                y: 87,
            });
            for (let i = 0; i < intersects.length; i++) {
                // interAttributes are glTF attributes for b3dm tiles
                // (e.g. position, normal, batch id)
                const interAttributes = intersects[i].object.geometry.attributes;
                if (interAttributes) {
                    if (interAttributes._BATCHID) {
                        // face is a Face3 object of THREE which is a
                        // triangular face. face.a is its first vertex
                        const face = intersects[i].face.a;
                        // return the  batch id of the face (all vertices
                        // of a face have the same batch id)
                        return interAttributes._BATCHID.array[face];
                    }
                }
            }
            // default erroneous batchID value
            return -1;
        });

        assert.equal(batchID, 31);
    });
});
