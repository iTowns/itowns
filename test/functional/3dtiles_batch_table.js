const assert = require('assert');

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

    // Picks the object at (218,90) and verifies that its batch id is correct
    it('should pick the right object', async () => {
        const batchID = await page.evaluate(
            () => {
                const intersects = view.pickObjectsAt({
                    x: 218,
                    y: 90,
                });
                const batchInfo = getPickedBatchInfo(intersects);
                return batchInfo.batchID;
            },
        );

        // Verify that the object is correctly picked
        assert.equal(batchID, 29);
    });

    // Verifies that the batch table and batch table hierarchy extension
    // picked information are correct for object at { x: 218, y: 90 }
    it('should return the batch table and batch hierarchy picked information',
        async () => {
            // Picks the object at (218,90) and gets its pickingInfo from
            // the batch table and the batch table hierarchy
            const pickingInfo = await page.evaluate(
                () => {
                    const intersects = view.pickObjectsAt({
                        x: 218,
                        y: 90,
                    });
                    const batchInfo = getPickedBatchInfo(intersects);
                    return batchInfo.batchTable.getPickingInfo(
                        batchInfo.batchID,
                    );
                },
            );

            // Create the expected object
            const expectedPickingInfo = {
                BatchTable: {
                    height: 10,
                    area: 20,
                },
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
            };

            assert.deepStrictEqual(pickingInfo, expectedPickingInfo);
        });
});
