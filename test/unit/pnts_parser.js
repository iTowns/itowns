import assert from 'assert';
import PntsParser from 'Parser/PntsParser';

function bufferFromString(pnts, size) {
    const buffer = new ArrayBuffer(size);
    const typed = new Uint8Array(buffer);
    let next = 0;
    for (const word of pnts.split(/\s+/)) {
        if (word.length == 2) {
            typed[next++] = parseInt(word, 16);
        }
    }
    assert.equal(next, size);
    return buffer;
}

describe('pnts parser', function () {
    const pnts = `
        70 6e 74 73 01 00 00 00  82 00 00 00 48 00 00 00
        1e 00 00 00 00 00 00 00  00 00 00 00 7b 22 50 4f
        49 4e 54 53 5f 4c 45 4e  47 54 48 22 3a 32 2c 22
        50 4f 53 49 54 49 4f 4e  22 3a 7b 22 62 79 74 65
        4f 66 66 73 65 74 22 3a  30 7d 2c 22 52 47 42 22
        3a 7b 22 62 79 74 65 4f  66 66 73 65 74 22 3a 32
        34 7d 7d 20 f1 34 09 42  90 a9 56 42 9c 15 24 41
        58 9b 0d 42 90 a9 56 42  9c 15 24 41 e0 9b 85 b7
        8f 89`;
    it('should return the correct points', function (done) {
        const buffer = bufferFromString(pnts, 16 * 8 + 2);

        PntsParser.parse(buffer).then((result) => {
            // 2 points of 3 components in the geometry
            assert.equal(
                result.point.geometry.attributes.position.array.length,
                2 * 3);
            // 'Red': 224, 'Green': 155, 'Blue': 133
            assert.equal(
                result.point.geometry.attributes.color.array[1],
                155);

            done();
        });
    });
});
