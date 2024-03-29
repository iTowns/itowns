import assert from 'assert';

describe('3dtiles_batch_table', function _() {
    let result;
    before(async () => {
        result = await loadExample(
            'examples/3dtiles_batch_table.html',
            this.fullTitle(),
        );
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should return the globe and 3d tiles layer', async () => {
        const layers = await page.evaluate(
            () => view.pickObjectsAt({
                x: 218,
                y: 90,
            })
                .map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('globe') >= 0);
        assert.ok(layers.indexOf('3d-tiles-bt-hierarchy') >= 0);
    });

    // Verifies that the batch id,  batch table and batch table hierarchy
    // extension picked information are correct for object at { x: 218, y: 90 }
    it('should return the batch table and batch hierarchy picked information',
        async function _it() {
            // Picks the object at (218,90) and gets its closest c3DTileFeature
            const pickResult = await page.evaluate(
                () => {
                    const intersects = view.pickObjectsAt({
                        x: 218,
                        y: 90,
                    });
                    const layer = view.getLayerById('3d-tiles-bt-hierarchy');
                    const c3DTileFeaturePicked = layer.getC3DTileFeatureFromIntersectsArray(intersects);
                    return {
                        info: c3DTileFeaturePicked.getInfo(),
                        batchId: c3DTileFeaturePicked.batchId,
                    };
                },
            );

            // Create the expected object
            const expectedPickingInfo = {
                batchTable: {
                    height: 10,
                    area: 20,
                },
                extensions: {
                    '3DTILES_batch_table_hierarchy': {
                        wall: {
                            wall_name: 'wall2',
                            wall_paint: 'blue',
                            wall_windows: 4,
                        },
                        building: {
                            building_name: 'building2',
                            building_area: 39.3,
                        },
                        zone: {
                            zone_name: 'zone0',
                            zone_buildings: 3,
                        },
                    },
                },
            };

            assert.equal(pickResult.batchId, 29);
            assert.deepStrictEqual(pickResult.info, expectedPickingInfo);
        });
});
