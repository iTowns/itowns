import assert from 'assert';
import fs from 'fs';
import Path from 'path';
import Source from 'Source/Source';
import WFSSource from 'Source/WFSSource';
import WMTSSource from 'Source/WMTSSource';
import WMSSource from 'Source/WMSSource';
import TMSSource from 'Source/TMSSource';
import FileSource from 'Source/FileSource';
import Extent from 'Core/Geographic/Extent';

function defer() {
    var deferredPromise = {};
    deferredPromise.promise = new Promise(function (resolve) {
        deferredPromise.resolve = resolve;
    });
    return deferredPromise;
}

const geojson = defer();

// To load geojson without parse the file content
const urlGeojson = Path.resolve(__dirname, '../data/geojson/holes.geojson.json');
fs.readFile(urlGeojson, 'utf8', function (err, content) {
    geojson.resolve(content);
});

global.window = {};
global.URL = function URL() {
    this.ref = undefined;
};

const vendorSpecific = {
    buffer: 4096,
    format_options: 'dpi:300;quantizer:octree',
    tiled: true,
};

describe('Sources', function () {
    describe('Source', function () {
        const paramsSource = {
            url: 'http://',
        };

        it('should instance and throw error for Source', function () {
            const source = new Source(paramsSource);
            assert.throws(source.urlFromExtent, Error);
            assert.throws(source.extentInsideLimit, Error);
            assert.throws(source.extentsInsideLimit, Error);
        });

        it('should throw an error for having no url', function () {
            assert.throws(() => new Source({}), Error);
        });
    });

    describe('WFSSource', function () {
        const paramsWFS = {
            url: 'http://',
            typeName: 'test',
            projection: 'EPSG:4326',
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
            const source = new WFSSource(paramsWFS);
            assert.throws(() => source.handlingError(new Error('error'), 'http://test'));
        });
    });

    describe('WMTSSource', function () {
        const paramsWMTS = {
            url: 'http://',
            name: 'name',
        };

        it('should throw an error for having no name', function () {
            assert.throws(() => new WMTSSource({}), Error);
        });

        it('should instance and use WMTSSource', function () {
            const source = new WMTSSource(paramsWMTS);
            const extent = new Extent('WMTS:PM', 5, 0, 0);
            assert.ok(source.isWMTSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent));
            assert.ok(source.extentsInsideLimit([extent, extent]));
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
            const extent = new Extent('WMTS:PM', 5, 0, 0);
            assert.ok(source.isWMTSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent));
            assert.ok(source.extentsInsideLimit([extent, extent]));
        });
    });

    describe('WMSSource', function () {
        const paramsWMS = {
            url: 'http://',
            name: 'name',
            extent: [-90, 90, -45, 45],
            projection: 'EPSG:4326',
        };

        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new WMSSource({}), Error);
            assert.throws(() => new WMSSource({ name: 'wms' }), Error);
            assert.throws(() => new WMSSource({ name: 'wms', extent: [] }), Error);
        });

        it('should instance and use WMSSource', function () {
            const source = new WMSSource(paramsWMS);
            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            assert.ok(source.isWMSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent));
            assert.ok(source.extentsInsideLimit([extent, extent]));
        });

        it('should set the correct axisOrder', function () {
            paramsWMS.projection = 'EPSG:3857';
            const source = new WMSSource(paramsWMS);
            assert.strictEqual(source.axisOrder, 'wsen');
            paramsWMS.projection = 'EPSG:4326';
        });

        it('should use vendor specific parameters for the creation of the WMS url', function () {
            paramsWMS.vendorSpecific = vendorSpecific;
            const source = new WMSSource(paramsWMS);
            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            const url = source.urlFromExtent(extent);
            const end = '&buffer=4096&format_options=dpi:300;quantizer:octree&tiled=true';
            assert.ok(url.endsWith(end));
        });

        it('should assert that the array of extent is outside the limit', function () {
            const source = new WMSSource(paramsWMS);
            const extents = [
                new Extent('EPSG:4326', 0, 10, 0, 10),
                new Extent('EPSG:4326', -100, -90, 0, 10),
            ];
            assert.ok(!source.extentsInsideLimit(extents));
        });
    });

    describe('TMSSource', function () {
        const paramsTMS = {
            url: 'http://',
        };

        it('should instance and use TMSSource', function () {
            const source = new TMSSource(paramsTMS);
            const extent = new Extent('WMTS:PM', 5, 0, 0);
            assert.ok(source.isTMSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent));
            assert.ok(source.extentsInsideLimit([extent, extent]));
        });

        it('should set the tileMatrixSet to PM', function () {
            paramsTMS.projection = 'EPSG:3857';
            const source = new TMSSource(paramsTMS);
            assert.strictEqual(source.tileMatrixSet, 'PM');
        });

        it('should respect the tileMatrixSet', function () {
            paramsTMS.tileMatrixSet = 'FAKE';
            const source = new TMSSource(paramsTMS);
            assert.strictEqual(source.tileMatrixSet, 'FAKE');
        });
    });

    describe('FileSource', function () {
        it('should instance and use FileSource with url', function () {
            const source = new FileSource({
                url: '..',
                projection: 'EPSG:4326',
                extent: [0, 20, 0, 20],
            });

            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent));
            assert.ok(source.extentsInsideLimit([extent, extent]));
            assert.ok(!source.fetchedData);
            assert.ok(!source.parsedData);
            assert.ok(source.isFileSource);
        });

        it('should instance and use FileSource with fetchedData', function () {
            const source = new FileSource({
                fetchedData: { foo: 'bar' },
                projection: 'EPSG:4326',
            });

            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            assert.ok(source.urlFromExtent(extent).startsWith('fake-file-url'));
            assert.ok(source.fetchedData);
            assert.ok(!source.parsedData);
            assert.ok(source.isFileSource);
        });

        it('should instance and use FileSource with parsedData', function () {
            const source = new FileSource({
                parsedData: { foo: 'bar' },
                projection: 'EPSG:4326',
            });

            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            assert.ok(source.urlFromExtent(extent).startsWith('fake-file-url'));
            assert.ok(!source.fetchedData);
            assert.ok(source.parsedData);
            assert.ok(source.isFileSource);
        });

        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new FileSource({}), Error);
            assert.throws(() => new FileSource({ projection: 'EPSG:4326' }), Error);
        });

        describe('should set the projection from parsedData', function () {
            it('with the crs', function () {
                const source = new FileSource({
                    parsedData: { crs: 'EPSG:4326' },
                });
                assert.strictEqual(source.projection, 'EPSG:4326');
            });

            it('with the projection', function () {
                const source = new FileSource({
                    parsedData: { projection: 'EPSG:4326' },
                });
                assert.strictEqual(source.projection, 'EPSG:4326');
            });
        });
    });
});
