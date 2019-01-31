const assert = require('assert');

describe('3dtiles_hierarchy', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/3dtiles_hierarchy.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should return the globe and 3d tiles layer', async () => {
        const layers = await page.evaluate(
            () => view.pickObjectsAt({ x: 185, y: 145 }).map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('globe') >= 0);
        assert.ok(layers.indexOf('3d-tiles-bt-hierarchy') >= 0);
    });

    // Picks the object at (194,100) and verifies that its batch id is correct
    it('should pick the right object', async () => {
        const batchID = await page.evaluate(
            () => {
                const intersects = view.pickObjectsAt({ x: 185, y: 145 });
                for (let i = 0; i < intersects.length; i++) {
                    // interAttributes are glTF attributes for b3dm tiles
                    // (e.g. position, normal, batch id)
                    const interAttributes = intersects[i].object.geometry.attributes;
                    if (interAttributes && interAttributes._BATCHID) {
                        // face is a Face3 object of THREE which is a
                        // triangular face. face.a is its first vertex
                        const vertex = intersects[i].face.a;
                        // return the  batch id of the face (all vertices
                        // of a face have the same batch id)
                        return interAttributes._BATCHID.array[vertex];
                    }
                }
                // default erroneous batchID value
                return -1;
            },
        );

        // Verify that the object is correctly picked
        assert.equal(batchID, 29);
    });

    // Verifies that the batch table and batch table hierarchy extension
    // picking are correct for object at { x: 185, y: 145 }
    it('should return batch table hierarchy information', async () => {
        // Function for finding the batch table of the picked object
        // Refer to the doc here:
        // https://github.com/MEPP-team/RICT/blob/master/Doc/iTowns/Doc.md#itowns-internal-organisation-of-3d-tiles-data
        // to understand why this function is needed.
        function findBatchTable(object) {
            if (object.batchTable) {
                return object.batchTable;
            } if (object.parent) {
                return findBatchTable(object.parent);
            }
            return undefined;
        }
        // Picks the object at (185,145) and gets its pickingInfo from
        // the batch table and the batch table hierarchy
        const pickingInfo = await page.evaluate(
            () => {
                const intersects = view.pickObjectsAt({ x: 185, y: 145 });
                for (let i = 0; i < intersects.length; i++) {
                    // interAttributes are glTF attributes for b3dm tiles
                    // (e.g. position, normal, batch id)
                    const interAttributes = intersects[i].object.geometry.attributes;
                    if (interAttributes && interAttributes._BATCHID) {
                        // face is a Face3 object of THREE which is a
                        // triangular face. face.a is its first vertex
                        const vertex = intersects[i].face.a;
                        // return the  batch id of the face (all vertices
                        // of a face have the same batch id)
                        const batchID = interAttributes._BATCHID.array[vertex];

                        // Get the object from picking
                        const batchTable = findBatchTable(intersects[i].object);

                        // Print Batch id and batch table attributes in an
                        // ui element
                        return batchTable.getPickingInfo(batchID);
                    }
                }
                return {};
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
