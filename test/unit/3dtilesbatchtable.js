import assert from 'assert';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';
import { obj2ArrayBuff } from './utils';

describe('3D Tiles batch table', function () {
    it('Should parse JSON batch table from buffer', function () {
        const batchTable = {
            a1: ['bah', 'tah', 'ratata', 'lo'],
            a2: [0, 1, 2, 3],
        };

        const batchTableBuffer = obj2ArrayBuff(batchTable);

        const batchTableObj = new C3DTBatchTable(batchTableBuffer, batchTableBuffer.byteLength, 0, 4, {});

        assert.deepStrictEqual(batchTable, batchTableObj.content);
    });

    it('Should parse JSON and binary batch table from buffer', function () {
        const a1Val = ['bah', 'tah', 'ratata'];
        const binVal = [0, 1, 0];
        const expectedBatchTable = {
            a1: a1Val,
            bin: binVal,
        };

        const batchTableJsonPart = {
            a1: a1Val,
            bin: {
                byteOffset: 0,
                componentType: 'UNSIGNED_BYTE',
                type: 'SCALAR',
            },
        };

        const jsonPartBuffer = obj2ArrayBuff(batchTableJsonPart);

        const binPartUint8 = new Uint8Array(binVal);
        const binPartBuffer = binPartUint8.buffer;

        const batchTableBuffer = new Uint8Array(jsonPartBuffer.byteLength + binPartBuffer.byteLength);
        batchTableBuffer.set(new Uint8Array(jsonPartBuffer), 0);
        batchTableBuffer.set(new Uint8Array(binPartBuffer), jsonPartBuffer.byteLength);

        const batchTableObj = new C3DTBatchTable(batchTableBuffer, jsonPartBuffer.byteLength, binPartBuffer.byteLength, 3, {});

        assert.deepStrictEqual(expectedBatchTable, batchTableObj.content);
    });

    it('Should get batch table info for a given id', function () {
        const batchTableJSON = {
            name: ['Ferme', 'Mas des Tourelles', 'Mairie'],
            height: [10, 12, 6],
        };
        const batchTableBuffer = obj2ArrayBuff(batchTableJSON);
        const batchTable = new C3DTBatchTable(batchTableBuffer, batchTableBuffer.byteLength, 0, 4, {});

        const batchInfo = batchTable.getInfoById(0);
        const expectedBatchInfo = {
            batchTable: {
                name: 'Ferme',
                height: 10,
            },
        };
        assert.deepStrictEqual(batchInfo, expectedBatchInfo);
    });
});
