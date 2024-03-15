import assert from 'assert';
import fs from 'fs';
import GDFParser from 'Parser/GDFParser';

const gdfFile = fs.readFileSync('./test/data/EGM2008_simplified.gdf', { encoding: 'utf8' });

describe('GDFParser', function () {
    const text = gdfFile;

    it('should default `options.in.crs` parameter to `EPSG:4326`', async function () {
        const geoidGrid = await GDFParser.parse(text);
        assert.strictEqual(geoidGrid.extent.crs, 'EPSG:4326');
    });

    it('should parse text data into a GeoidGrid', async function () {
        const geoidGrid = await GDFParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.extent.west, -180);
        assert.strictEqual(geoidGrid.extent.east, 180);
        assert.strictEqual(geoidGrid.extent.south, -90);
        assert.strictEqual(geoidGrid.extent.north, 90);
        assert.strictEqual(geoidGrid.step.x, 45);
        assert.strictEqual(geoidGrid.step.y, 45);
    });

    it('should set a correct data reading method for `GeoidGrid`', async function () {
        const geoidGrid = await GDFParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.getData(geoidGrid.dataSize.y - 2, 1), -26.975163013039);
    });
});
