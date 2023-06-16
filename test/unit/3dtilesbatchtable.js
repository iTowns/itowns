import assert from 'assert';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';

describe('3D Tiles batch table', function () {
    // encode a javascript object into an arraybuffer (based on the 3D Tiles batch table encoding)
    function obj2ArrayBuff(obj) {
        const objJSON = JSON.stringify(obj);
        const encoder = new TextEncoder();
        const objUtf8 = encoder.encode(objJSON);
        const objUint8 = new Uint8Array(objUtf8);
        return objUint8.buffer;
    }

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
});
