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
        assert.ok(source.anyVisibleData(extent, 5));
    });

    it('should instance with tileMatrixSet', function () {
        paramsWMTS.tileMatrixSet = 'PM';
        paramsWMTS.tileMatrixSetLimits = {
            0: { MinTileRow: 0, MaxTileRow: 1, MinTileCol: 0, MaxTileCol: 1 },
            1: { MinTileRow: 0, MaxTileRow: 2, MinTileCol: 0, MaxTileCol: 2 },
            2: { MinTileRow: 0, MaxTileRow: 4, MinTileCol: 0, MaxTileCol: 4 },
            3: { MinTileRow: 0, MaxTileRow: 8, MinTileCol: 0, MaxTileCol: 8 },
            4: { MinTileRow: 0, MaxTileRow: 16, MinTileCol: 0, MaxTileCol: 16 },
            5: { MinTileRow: 0, MaxTileRow: 32, MinTileCol: 0, MaxTileCol: 32 },
        };
        const source = new WMTSSource(paramsWMTS);
        const extent = new Tile('TMS:3857', 5, 0, 0);
        source.onLayerAdded({ out: { crs: 'EPSG:4326' } });
        assert.ok(source.isWMTSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.anyVisibleData(extent, 5));
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

