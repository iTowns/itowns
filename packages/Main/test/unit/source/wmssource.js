import assert from 'assert';
import WMSSource from 'Source/WMSSource';
import { Extent } from '@itowns/geographic';

describe('WMSSource', function () {
    const paramsWMS = {
        url: 'http://domain.com',
        name: 'name',
        extent: [-90, 90, -45, 45],
        crs: 'EPSG:4326',
    };
    const vendorSpecific = {
        buffer: 4096,
        format_options: 'dpi:300;quantizer:octree',
        tiled: true,
    };

    it('should instance and use WMSSource', function () {
        const source = new WMSSource(paramsWMS);
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        assert.ok(source.isWMSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
    });

    it('should set the correct axisOrder', function () {
        paramsWMS.crs = 'EPSG:3857';
        const source = new WMSSource(paramsWMS);
        assert.strictEqual(source.axisOrder, 'wsen');
        paramsWMS.crs = 'EPSG:4326';
    });

    it('should use vendor specific parameters for the creation of the WMS url', function () {
        paramsWMS.vendorSpecific = vendorSpecific;
        const source = new WMSSource(paramsWMS);
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        const url = source.urlFromExtent(extent);
        const end = '&buffer=4096&format_options=dpi:300;quantizer:octree&tiled=true';
        assert.ok(url.endsWith(end));
    });
});

