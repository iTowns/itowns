import assert from 'assert';
import TMSSource from 'Source/TMSSource';
import Tile from 'Core/Tile/Tile';

describe('TMSSource', function () {
    let source;

    describe('instantiation', function () {
        // eslint-disable-next-line no-template-curly-in-string
        const urlDeprecated = 'http://${z}/${y}/${x}';
        const url = 'http://{z}/{y}/{x}';
        const crs = 'EPSG:3857';
        const tileMatrixSetLimits = {
            5: { minTileRow: 0, maxTileRow: 32, minTileCol: 0, maxTileCol: 32 },
        };

        it('without url', function () {
            assert.throws(() => new TMSSource({ url, tileMatrixSetLimits }), { message: 'New TMSSource/WMTSSource: crs is required' });
        });

        it('with deprecated url', function () {
            source = new TMSSource({ url: urlDeprecated, crs, tileMatrixSetLimits });
            assert.ok(source.isTMSSource);
            assert.equal(source.url, url);
        });

        it('with url', function () {
            source = new TMSSource({ url, crs, tileMatrixSetLimits });
            assert.ok(source.isTMSSource);
            assert.deepStrictEqual(source.zoom, { min: 5, max: 5 });
        });
    });

    describe('methods', function () {
        const zoom = 5;
        const row = 3;
        const col = 2;
        const extent = new Tile('TMS:3857', zoom, row, col);
        it('urlFromExtent', function () {
            assert.equal(source.urlFromExtent(extent), `http://${zoom}/${row}/${col}`);
        });

        it('hasData', function () {
            assert.ok(source.hasData(extent, extent.zoom));
        });
    });
});

