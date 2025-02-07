/* global createGtxBuffer */
import assert from 'assert';
import GTXParser from 'Parser/GTXParser';

describe('GTXParser', function () {
    const buffer = createGtxBuffer();

    it('should throw error if dataType parameter is wrongly specified', async function () {
        assert.throws(
            () => GTXParser.parse(buffer, { in: { dataType: 'foo', crs: 'EPSG:4326' } }),
            {
                name: 'Error',
                message: '`dataType` parameter is incorrect for GTXParser.parse method. This parameter must be ' +
                    'either `double` or `float`.',
            },
        );
    });

    it('should default `dataType` property to `float`', async function () {
        const geoidGrid = await GTXParser.parse(buffer, { in: { crs: 'EPSG:4326' } });
        const dataView = new DataView(buffer, 40);
        assert.strictEqual(
            geoidGrid.getData(1, 1),
            dataView.getFloat32(1688),
        );
    });

    it('should default `options.in.crs` parameter to `EPSG:4326`', async function () {
        const geoidGrid = await GTXParser.parse(buffer, { in: { dataType: 'float' } });
        assert.strictEqual(geoidGrid.extent.crs, 'EPSG:4326');
    });

    it('should parse ArrayBuffer data into a GeoidGrid', async function () {
        const geoidGrid = await GTXParser.parse(buffer, { in: { dataType: 'float', crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.extent.west, -5.5);
        assert.strictEqual(geoidGrid.extent.east, 8.499999999985999);
        assert.strictEqual(geoidGrid.extent.south, 42);
        assert.strictEqual(geoidGrid.extent.north, 51.5);
        assert.strictEqual(geoidGrid.step.x, 0.0333333333333);
        assert.strictEqual(geoidGrid.step.y, 0.025);
    });

    it('should set GeoidGrid reading method according to `dataType` property', async function () {
        const geoidGridFloat = await GTXParser.parse(buffer, { in: { dataType: 'float', crs: 'EPSG:4326' } });
        const geoidGridDouble = await GTXParser.parse(buffer, { in: { dataType: 'double', crs: 'EPSG:4326' } });
        const dataView = new DataView(buffer, 40);
        assert.strictEqual(
            geoidGridFloat.getData(1, 1),
            dataView.getFloat32(1688),
        );
        assert.strictEqual(
            geoidGridDouble.getData(1, 1),
            dataView.getFloat64(3376),
        );
    });
});
