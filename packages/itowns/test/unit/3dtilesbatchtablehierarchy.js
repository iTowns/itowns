import assert from 'assert';
import C3DTBatchTableHierarchyExtension from 'Core/3DTiles/C3DTBatchTableHierarchyExtension';

const batchTableHierarchyJSON = {
    classes: [
        {
            name: 'Wall',
            length: 6,
            instances: {
                color: ['white', 'red', 'yellow', 'gray', 'brown', 'black'],
            },
        },
        {
            name: 'Building',
            length: 3,
            instances: {
                name: ['unit29', 'unit20', 'unit93'],
                address: ['100 Main St', '102 Main St', '104 Main St'],
            },
        },
        {
            name: 'Owner',
            length: 3,
            instances: {
                type: ['city', 'resident', 'commercial'],
                id: [1120, 1250, 6445],
            },
        },
    ],
    instancesLength: 12,
    classIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2],
    parentCounts: [1, 3, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    parentIds: [6, 6, 10, 11, 7, 11, 7, 8, 8, 10, 10, 9],
};

const batchTableHierarchy = new C3DTBatchTableHierarchyExtension(batchTableHierarchyJSON);

describe('3D Tiles batch table hierarchy extension', function () {
    it('Should get info for a given id', function () {
        const expectedInfo = {
            Wall: {
                color: 'white',
            },
            Building: {
                name: 'unit29',
                address: '100 Main St',
            },
            Owner: {
                type: 'resident',
                id: 1250,
            },
        };
        const info = batchTableHierarchy.getInfoById(0);
        assert.deepStrictEqual(info, expectedInfo);
    });
});
