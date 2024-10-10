import assert from 'assert';
import fs from 'fs';
import ISGParser from 'Parser/ISGParser';

const isgFile = fs.readFileSync('./test/data/raf09_simplified.isg', { encoding: 'utf8' });

describe('ISGParser', function () {
    const text = isgFile;

    it('should default `options.in.crs` parameter to `EPSG:4326`', async function () {
        const geoidGrid = await ISGParser.parse(text);
        assert.strictEqual(geoidGrid.extent.crs, 'EPSG:4326');
    });

    it('should parse text data into a GeoidGrid', async function () {
        const geoidGrid = await ISGParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.extent.west, -5.50460);
        assert.strictEqual(geoidGrid.extent.east, 8.50460);
        assert.strictEqual(geoidGrid.extent.south, 42.94);
        assert.strictEqual(geoidGrid.extent.north, 50.56);
        assert.strictEqual(geoidGrid.step.x, 0.0242);
        assert.strictEqual(geoidGrid.step.y, 1.9050);
    });

    it('should set a correct data reading method for `GeoidGrid`', async function () {
        const geoidGrid = await ISGParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.getData(1, 1), 60);
    });
});
