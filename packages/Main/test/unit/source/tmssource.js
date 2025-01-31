import assert from 'assert';
import TMSSource from 'Source/TMSSource';
import Tile from 'Core/Tile/Tile';

describe('TMSSource', function () {
    const paramsTMS = {
        url: 'http://',
        crs: 'EPSG:3857',
        tileMatrixSetLimits: {
            5: { minTileRow: 0, maxTileRow: 32, minTileCol: 0, maxTileCol: 32 },
        },
    };

    it('should instance and use TMSSource', function () {
        const source = new TMSSource(paramsTMS);
        source.onLayerAdded({ out: { crs: 'EPSG:4326' } });
        const extent = new Tile('TMS:3857', 5, 0, 0);
        assert.ok(source.isTMSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent, extent.zoom));
    });
});

