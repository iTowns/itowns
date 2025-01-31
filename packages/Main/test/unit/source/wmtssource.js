import assert from 'assert';
import WMTSSource from 'Source/WMTSSource';

import Tile from 'Core/Tile/Tile';

describe('WMTSSource', function () {
    const paramsWMTS = {
        url: 'http://domain.com',
        name: 'name',
        crs: 'EPSG:4326',
        tileMatrixSet: 'PM',
    };
    const vendorSpecific = {
        buffer: 4096,
        format_options: 'dpi:300;quantizer:octree',
        tiled: true,
    };

    it('should throw an error for having no name', function () {
        assert.throws(() => new WMTSSource({}), Error);
    });

    it('should instance and use WMTSSource', function () {
        const source = new WMTSSource(paramsWMTS);
        const extent = new Tile('TMS:3857', 5, 0, 0);
        assert.ok(source.isWMTSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent, 5));
    });

    it('should instance with tileMatrixSet', function () {
        paramsWMTS.tileMatrixSet = 'PM';
        paramsWMTS.tileMatrixSetLimits = {
            0: { minTileRow: 0, maxTileRow: 1, minTileCol: 0, maxTileCol: 1 },
            1: { minTileRow: 0, maxTileRow: 2, minTileCol: 0, maxTileCol: 2 },
            2: { minTileRow: 0, maxTileRow: 4, minTileCol: 0, maxTileCol: 4 },
            3: { minTileRow: 0, maxTileRow: 8, minTileCol: 0, maxTileCol: 8 },
            4: { minTileRow: 0, maxTileRow: 16, minTileCol: 0, maxTileCol: 16 },
            5: { minTileRow: 0, maxTileRow: 32, minTileCol: 0, maxTileCol: 32 },
        };
        const source = new WMTSSource(paramsWMTS);
        const extent = new Tile('TMS:3857', 5, 0, 0);
        source.onLayerAdded({ out: { crs: 'EPSG:4326' } });
        assert.ok(source.isWMTSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent, 5));
    });

    it('should use vendor specific parameters for the creation of the WMTS url', function () {
        paramsWMTS.vendorSpecific = vendorSpecific;
        const source = new WMTSSource(paramsWMTS);
        const tile = new Tile('TMS:4326', 0, 10, 0);
        const url = source.urlFromExtent(tile);
        const end = '&buffer=4096&format_options=dpi:300;quantizer:octree&tiled=true';
        assert.ok(url.endsWith(end));
    });
});

