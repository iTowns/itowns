import { Matrix4 } from 'three';
import assert from 'assert';
import Source from 'Source/Source';
import Layer from 'Layer/Layer';
import WFSSource from 'Source/WFSSource';
import WMTSSource from 'Source/WMTSSource';
import WMSSource from 'Source/WMSSource';
import TMSSource from 'Source/TMSSource';
import FileSource from 'Source/FileSource';
import OrientedImageSource from 'Source/OrientedImageSource';
import C3DTilesSource from 'Source/C3DTilesSource';
import C3DTilesIonSource from 'Source/C3DTilesIonSource';
import Extent from 'Core/Geographic/Extent';
import Tile from 'Core/Tile/Tile';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';

import fileSource from '../data/filesource/featCollec_Polygone.geojson';

const tileset = {};

describe('Sources', function () {
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
        });

        it('should throw an error for having no url', function () {
            assert.throws(() => new Source({}), Error);
        });
    });

    describe('WFSSource', function () {
        const paramsWFS = {
            url: 'http://domain.com',
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
            const tile = new Tile('EPSG:4326', 5, 10, 15);
            const keys = source.requestToKey(tile);
            assert.equal(tile.zoom, keys[0]);
            assert.equal(tile.row, keys[1]);
            assert.equal(tile.col, keys[2]);
            const extentepsg = new Extent('EPSG:4326', 5.5, 10, 22.3, 89.34);
            const keysepsg = source.requestToKey(extentepsg);
            assert.equal(extentepsg.south, keysepsg[1]);
            assert.equal(extentepsg.west, keysepsg[2]);
        });
    });

    describe('WMTSSource', function () {
        const paramsWMTS = {
            url: 'http://domain.com',
            name: 'name',
            crs: 'EPSG:4326',
            tileMatrixSet: 'PM',
        };

        it('should throw an error for having no name', function () {
            assert.throws(() => new WMTSSource({}), Error);
        });

        it('should instance and use WMTSSource', function () {
            const source = new WMTSSource(paramsWMTS);
            const extent = new Tile('EPSG:3857', 5, 0, 0);
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
            const extent = new Tile('EPSG:3857', 5, 0, 0);
            source.onLayerAdded({ out: { crs: 'EPSG:4326' } });
            assert.ok(source.isWMTSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent, 5));
        });

        it('should use vendor specific parameters for the creation of the WMTS url', function () {
            paramsWMTS.vendorSpecific = vendorSpecific;
            const source = new WMTSSource(paramsWMTS);
            const tile = new Tile('EPSG:4326', 0, 10, 0);
            const url = source.urlFromExtent(tile);
            const end = '&buffer=4096&format_options=dpi:300;quantizer:octree&tiled=true';
            assert.ok(url.endsWith(end));
        });
    });

    describe('WMSSource', function () {
        const paramsWMS = {
            url: 'http://domain.com',
            name: 'name',
            extent: [-90, 90, -45, 45],
            crs: 'EPSG:4326',
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

    describe('OrientedImageSource', function () {
        it('instance OrientedImageSource', function (done) {
            const source = new OrientedImageSource({ url: 'http://source.test' });
            source.whenReady
                .then((a) => {
                    assert.equal(Object.keys(a).length, 2);
                    done();
                }).catch(done);
        });

        it('should return keys OrientedImageSource from request', function () {
            const source = new OrientedImageSource({ url: 'http://source.test' });
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
            tileMatrixSetLimits: {
                5: { minTileRow: 0, maxTileRow: 32, minTileCol: 0, maxTileCol: 32 },
            },
        };

        it('should instance and use TMSSource', function () {
            const source = new TMSSource(paramsTMS);
            source.onLayerAdded({ out: { crs: 'EPSG:4326' } });
            const extent = new Tile('EPSG:3857', 5, 0, 0);
            assert.ok(source.isTMSSource);
            assert.ok(source.urlFromExtent(extent));
            assert.ok(source.extentInsideLimit(extent, extent.zoom));
        });
    });

    let fetchedData;

    describe('FileSource', function () {
        let stubFetcherJson;
        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(() => Promise.resolve(JSON.parse(fileSource)));
        });

        after(function () {
            stubFetcherJson.restore();
        });

        it('should instance FileSource with no source.fetchedData', function _it(done) {
            const urlFilesource = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson';
            const source = new FileSource({
                url: urlFilesource,
                crs: 'EPSG:4326',
                format: 'application/json',
                extent: new Extent('EPSG:4326', 0, 20, 0, 20),
                zoom: { min: 0, max: 21 },
            });

            source.whenReady
                .then(() => {
                    const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
                    assert.ok(source.urlFromExtent());
                    assert.ok(source.extentInsideLimit(extent));
                    assert.ok(source.fetchedData);
                    assert.ok(!source.features);
                    assert.ok(source.isFileSource);
                    fetchedData = source.fetchedData;
                    assert.equal(fetchedData.features[0].properties.nom, 'Ariège_simplified');
                    done();
                }).catch(done);
        });

        it('should instance FileSource with source.fetchedData and parse data with a layer', function (done) {
            // TO DO need cleareance: what is this test for ?
            //  - testing instanceation Filesource when fetchedData and source.feature is already available ?
            //  - testing instanciate Layer ?
            //  - testing source.onLayerAdded ?
            //  - testing souce.loadData ?
            const source = new FileSource({
                fetchedData,
                format: 'application/json',
                crs: 'EPSG:4326',
            });

            assert.ok(!source.features);
            assert.equal(source.urlFromExtent(), 'none');
            assert.ok(source.fetchedData);
            assert.ok(source.isFileSource);

            const layer = new Layer('09-ariege', { crs: 'EPSG:4326', source, structure: '2d' });
            layer.source.onLayerAdded({ out: layer });

            layer.whenReady
                .then(() => {
                    source.loadData([], layer)
                        .then((featureCollection) => {
                            assert.equal(featureCollection.features[0].vertices.length, 16);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        });
                });
            layer._resolve();
        });

        it('should instance and use FileSource with features', function () {
            const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
            const source = new FileSource({
                features: { foo: 'bar', crs: 'EPSG:4326', extent, matrixWorld: new Matrix4() },
                crs: 'EPSG:4326',
                format: 'application/json',
            });
            source.onLayerAdded({ out: { crs: source.crs } });
            assert.ok(source.urlFromExtent(extent).startsWith('none'));
            assert.ok(!source.fetchedData);

            assert.ok(source.isFileSource);
        });

        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new FileSource({}), Error);
            assert.throws(() => new FileSource({ crs: 'EPSG:4326' }), Error);
        });

        it('should set the crs projection from features', function () {
            const source = new FileSource({
                features: { crs: 'EPSG:4326' },
                format: 'application/json',
            });
            assert.strictEqual(source.crs, 'EPSG:4326');
        });
    });

    describe('C3DTilesSource', function () {
        let stubFetcherJson;
        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(() => Promise.resolve(tileset));
        });
        after(function () {
            stubFetcherJson.restore();
        });

        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new C3DTilesSource({}), Error);
        });

        it('should instance C3DTilesSource', function (done) {
            const url3dTileset = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/' +
                '3DTiles/lyon_1_4978/tileset.json';
            const source = new C3DTilesSource({ url: url3dTileset });
            source.whenReady
                .then(() => {
                    assert.ok(source.isC3DTilesSource);
                    assert.strictEqual(source.url, url3dTileset);
                    assert.strictEqual(source.baseUrl, url3dTileset.slice(0, url3dTileset.lastIndexOf('/') + 1));
                    done();
                }).catch(done);
        });
    });

    describe('C3DTilesIonSource', function () {
        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new C3DTilesIonSource({}), Error);
            assert.throws(() => new C3DTilesIonSource({ accessToken: 'free-3d-tiles' }), Error);
            assert.throws(() => new C3DTilesIonSource({ assetId: '66666' }), Error);
        });
    });
});
