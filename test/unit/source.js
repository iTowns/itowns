import assert from 'assert';
import Source from 'Source/Source';
import Layer from 'Layer/Layer';
import WFSSource from 'Source/WFSSource';
import WMTSSource from 'Source/WMTSSource';
import WMSSource from 'Source/WMSSource';
import TMSSource from 'Source/TMSSource';
import FileSource from 'Source/FileSource';
import OrientedImageSource from 'Source/OrientedImageSource';
import Extent from 'Core/Geographic/Extent';
import HttpsProxyAgent from 'https-proxy-agent';

describe('Sources', function () {
    // geojson url to parse
    const urlGeojson = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson';

    const vendorSpecific = {
        buffer: 4096,
        format_options: 'dpi:300;quantizer:octree',
        tiled: true,
    };

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
            crs: 'EPSG:4326',
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
            const extent = new Extent('TMS:4326', 5, 10, 15);
            const keys = source.requestToKey(extent);
            assert.equal(extent.zoom, keys[0]);
            assert.equal(extent.row, keys[1]);
            assert.equal(extent.col, keys[2]);
            const extentepsg = new Extent('EPSG:4326', 5.5, 10, 22.3, 89.34);
            const keysepsg = source.requestToKey(extentepsg);
            assert.equal(extentepsg.zoom, 0);
            assert.equal(extentepsg.south, keysepsg[1]);
            assert.equal(extentepsg.west, keysepsg[2]);
        });
    });

    describe('WMTSSource', function () {
        const paramsWMTS = {
            url: 'http://',
            name: 'name',
            crs: 'EPSG:4326',
        };

        it('should throw an error for having no name', function () {
            assert.throws(() => new WMTSSource({}), Error);
        });

        it('should instance and use WMTSSource', function () {
            const source = new WMTSSource(paramsWMTS);
            const extent = new Extent('TMS:3857', 5, 0, 0);
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
            const extent = new Extent('TMS:3857', 5, 0, 0);
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
            crs: 'EPSG:4326',
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

        it('should assert that the array of extent is outside the limit', function () {
            const source = new WMSSource(paramsWMS);
            const extents = [
                new Extent('EPSG:4326', 0, 10, 0, 10),
                new Extent('EPSG:4326', -100, -90, 0, 10),
            ];
            assert.ok(!source.extentsInsideLimit(extents));
        });
    });

    describe('OrientedImageSource', function () {
        it('instance OrientedImageSource', function (done) {
            const source = new OrientedImageSource({ url: 'none' });
            source.whenReady.then((a) => {
                assert.equal(Object.keys(a).length, 2);
                done();
            });
        });

        it('should return keys OrientedImageSource from request', function () {
            const source = new OrientedImageSource({ url: 'none' });
            const image = { cameraId: 5, panoId: 10 };
            const keys = source.requestToKey(image);
            assert.equal(image.cameraId, keys[0]);
            assert.equal(image.panoId, keys[1]);
        });
    });

    describe('TMSSource', function () {
        const paramsTMS = {
            url: 'http://',
            crs: 'EPSG:3857',
        };

        it('should instance and use TMSSource', function () {
            const source = new TMSSource(paramsTMS);
            const extent = new Extent('TMS:3857', 5, 0, 0);
            assert.ok(source.isTMSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent));
            assert.ok(source.extentsInsideLimit([extent, extent]));
        });
    });

    let fetchedData;

    describe('FileSource', function () {
        it('should instance FileSource and fetch file', function (done) {
            const source = new FileSource({
                url: urlGeojson,
                crs: 'EPSG:4326',
                format: 'application/json',
                extent: new Extent('EPSG:4326', 0, 20, 0, 20),
                zoom: { min: 0, max: 21 },
                networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            });

            source.whenReady.then(() => {
                const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
                assert.ok(source.urlFromExtent());
                assert.ok(source.extentInsideLimit(extent));
                assert.ok(source.extentsInsideLimit([extent, extent]));
                assert.ok(source.fetchedData);
                assert.ok(source.fetchedData);
                assert.ok(!source.features);
                assert.ok(source.isFileSource);
                fetchedData = source.fetchedData;
                assert.equal(fetchedData.properties.nom, 'Ariège');
                done();
            });
        });

        it('should instance FileSource with fetchedData and parse data with a layer', function (done) {
            const source = new FileSource({
                fetchedData,
                format: 'application/json',
                crs: 'EPSG:4326',
            });

            assert.ok(!source.features);
            assert.equal(source.urlFromExtent(), 'fake-file-url');
            assert.ok(source.fetchedData);
            assert.ok(source.isFileSource);

            const layer = new Layer('09-ariege', { crs: 'EPSG:4326', source, withAltitude: false });
            layer.source.onLayerAdded({ out: layer });

            layer.whenReady.then(() => {
                const promise = source.loadData([], layer);
                promise.then((featureCollection) => {
                    assert.equal(featureCollection.features[0].vertices.length, 3536);
                    done();
                });
            });
            layer._resolve();
        });

        it('should instance and use FileSource with features', function () {
            const source = new FileSource({
                features: { foo: 'bar', crs: 'EPSG:4326' },
                crs: 'EPSG:4326',
            });
            source.onLayerAdded({ out: { crs: source.crs } });
            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            assert.ok(source.urlFromExtent(extent).startsWith('fake-file-url'));
            assert.ok(!source.fetchedData);

            assert.ok(source.isFileSource);
        });

        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new FileSource({}), Error);
            assert.throws(() => new FileSource({ crs: 'EPSG:4326' }), Error);
        });

        describe('should set the crs projection from features', function () {
            it('with the crs', function () {
                const source = new FileSource({
                    features: { crs: 'EPSG:4326' },
                });
                assert.strictEqual(source.crs, 'EPSG:4326');
            });

            it('with the crs projection', function () {
                const source = new FileSource({
                    features: { crs: 'EPSG:4326' },
                });
                assert.strictEqual(source.crs, 'EPSG:4326');
            });
        });
    });
});
