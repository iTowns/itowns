import assert from 'assert';
import WFSSource from 'Source/WFSSource';

import Extent from 'Core/Geographic/Extent';
import Tile from 'Core/Tile/Tile';

describe('WFSSource', function () {
    const paramsWFS = {
        url: 'http://domain.com',
        typeName: 'test',
        crs: 'EPSG:4326',
    };
    const vendorSpecific = {
        buffer: 4096,
        format_options: 'dpi:300;quantizer:octree',
        tiled: true,
    };

    it('should instance and use WFSSource', function () {
        const source = new WFSSource(paramsWFS);
        assert.ok(source.isWFSSource);
    });

    it('should throw an error for having no required parameters', function () {
        assert.throws(() => new WFSSource({}), Error);
        assert.throws(() => new WFSSource({ typeName: 'test' }), Error);
    });

    it('should use vendor specific parameters for the creation of the WFS url', function () {
        paramsWFS.vendorSpecific = vendorSpecific;
        const source = new WFSSource(paramsWFS);
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        const url = source.urlFromExtent(extent);
        const end = '&buffer=4096&format_options=dpi:300;quantizer:octree&tiled=true';
        assert.ok(url.endsWith(end));
    });

    it('should handles errors', function () {
        const bce = console.error;
        // Mute console error
        console.error = () => {};
        const source = new WFSSource(paramsWFS);
        assert.throws(() => source.handlingError(new Error('error')));
        console.error = bce;
    });

    it('should return keys from request', function () {
        const source = new WFSSource(paramsWFS);
        const tile = new Tile('TMS:4326', 5, 10, 15);
        const keys = source.keysFromExtent(tile);
        assert.equal(tile.zoom, keys[0]);
        assert.equal(tile.row, keys[1]);
        assert.equal(tile.col, keys[2]);
        const extentepsg = new Extent('EPSG:4326', 5.5, 10, 22.3, 89.34);
        const keysepsg = source.keysFromExtent(extentepsg);
        assert.equal(extentepsg.south, keysepsg[1]);
        assert.equal(extentepsg.west, keysepsg[2]);
    });
});

