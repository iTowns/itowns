import assert from 'assert';
import PotreeBinParser from 'Parser/PotreeBinParser';

describe('PotreeBinParser', function () {
    it('should correctly parse position buffer', function () {
        const buffer = new ArrayBuffer(12 * 4);
        const dv = new DataView(buffer);
        for (let i = 0; i < 12; i++) {
            dv.setInt32(i * 4, i * 2, true);
        }

        const options = {
            in: {
                pointAttributes: ['POSITION_CARTESIAN'],
            },
        };

        return PotreeBinParser.parse(buffer, options).then((geom) => {
            const posAttr = geom.getAttribute('position');
            assert.equal(posAttr.itemSize, 3);
            assert.ok(posAttr.array instanceof Float32Array);
            assert.equal(posAttr.array.length, 12);
            assert.equal(posAttr.array[0], 0);
            assert.equal(posAttr.array[11], 22);
        });
    });

    it('should correctly parse a complex buffer (positions, intensity, rgb and classification)', function () {
        // generate 12 points: positions, intensity, rgba, classification
        const numbyte = 3 * 4 + 2 + 4 * 1 + 1;
        const numPoints = 5;
        const buffer = new ArrayBuffer(numPoints * numbyte);
        const dv = new DataView(buffer);
        for (let i = 0; i < numPoints; i++) {
            // position
            dv.setInt32(i * numbyte + 0, 3 * i, true);
            dv.setInt32(i * numbyte + 4, 3 * i + 1, true);
            dv.setInt32(i * numbyte + 8, 3 * i + 2, true);
            // intensity
            dv.setInt16(i * numbyte + 12, 100 + i, true);
            // color
            dv.setUint8(i * numbyte + 14, 200 + 4 * i);
            dv.setUint8(i * numbyte + 15, 201 + 4 * i);
            dv.setUint8(i * numbyte + 16, 202 + 4 * i);
            dv.setUint8(i * numbyte + 17, 203 + 4 * i);

            // classification
            dv.setUint8(i * numbyte + 18, i * 3);
        }

        const options = {
            in: {
                pointAttributes: ['POSITION_CARTESIAN', 'INTENSITY', 'COLOR_PACKED', 'CLASSIFICATION'],
            },
        };

        return PotreeBinParser.parse(buffer, options).then(function (geom) {
            const posAttr = geom.getAttribute('position');
            const intensityAttr = geom.getAttribute('intensity');
            const colorAttr = geom.getAttribute('color');
            const classificationAttr = geom.getAttribute('classification');

            // check position buffer
            assert.equal(posAttr.itemSize, 3);
            assert.deepStrictEqual(posAttr.array, Float32Array.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14));
            // check intensity
            assert.equal(intensityAttr.itemSize, 1);
            assert.deepStrictEqual(intensityAttr.array, Uint16Array.of(100, 101, 102, 103, 104));
            // check colors
            assert.equal(colorAttr.itemSize, 4);
            assert.deepStrictEqual(colorAttr.array, Uint8Array.of(
                200, 201, 202, 203,
                204, 205, 206, 207,
                208, 209, 210, 211,
                212, 213, 214, 215,
                216, 217, 218, 219));
            // check classif
            assert.equal(classificationAttr.itemSize, 1);
            assert.deepStrictEqual(classificationAttr.array, Uint8Array.of(0, 3, 6, 9, 12));
        });
    });
});
