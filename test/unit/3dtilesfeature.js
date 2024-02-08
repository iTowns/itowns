import assert from 'assert';
import * as THREE from 'three';
import C3DTFeature from 'Core/3DTiles/C3DTFeature';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';
import { obj2ArrayBuff } from './utils';


describe('3D tiles feature', () => {
    const obj = new THREE.Object3D();
    const batchTableJson = {
        id: [12, 158],
        height: [13, 22],
    };
    const batchTableBuffer = obj2ArrayBuff(batchTableJson);
    obj.batchTable = new C3DTBatchTable(batchTableBuffer, batchTableBuffer.byteLength, 0, 2, {});
    const feature = new C3DTFeature(1, 1, { start: 0, count: 6 }, {}, obj);

    it('Get batch table info for feature batch id', function () {
        const expectedInfo = {
            batchTable: {
                id: 158,
                height: 22,
            },
        };
        const info = feature.getInfo();
        assert.deepStrictEqual(info, expectedInfo);
    });
});
