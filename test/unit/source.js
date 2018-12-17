import assert from 'assert';
import fs from 'fs';
import Path from 'path';
import Source from 'Source/Source';
import WMTSSource from 'Source/WMTSSource';
import WMSSource from 'Source/WMSSource';
import TMSSource from 'Source/TMSSource';
import FileSource from 'Source/FileSource';
import StaticSource from 'Source/StaticSource';
import Fetcher from 'Provider/Fetcher';
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

const paramsWMS = {
    url: 'http://',
    name: 'name',
    format: 'image/png',
    extent: [-90, 90, -45, 45],
    projection: 'EPSG:4326',
};

const paramsWMTS = {
    url: 'http://',
    name: 'name',
    format: 'image/png',
};

const paramsTMS = {
    url: 'http://',
};

describe('Source', function () {
    it('Should instance and throw error for Source', function () {
        const source = new Source({ url: 'http://'  });
        assert.throws(source.urlFromExtent, Error);
        assert.throws(source.extentInsideLimit, Error);
        assert.throws(source.extentsInsideLimit, Error);
    });
    it('Should instance and use WMTSSource', function () {
        const source = new WMTSSource(paramsWMTS);
        const extent = new Extent('WMTS:PM', 5, 0, 0);
        assert.ok(source.isWMTSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
        assert.ok(source.extentsInsideLimit([extent, extent]));
    });
    it('Should instance and use WMSSource', function () {
        const source = new WMSSource(paramsWMS);
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        assert.ok(source.isWMSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
        assert.ok(source.extentsInsideLimit([extent, extent]));
    });
    it('Should use vendor specific parameters for the creation of the WMS url', function () {
        paramsWMS.vendorSpecific = {
            buffer: 4096,
            format_options: 'dpi:300;quantizer:octree',
            tiled: true,
        };
        const source = new WMSSource(paramsWMS);
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        const url = source.urlFromExtent(extent);
        const end = '&buffer=4096&format_options=dpi:300;quantizer:octree&tiled=true';
        assert.ok(url.endsWith(end));
    });
    it('Should instance and use TMSSource', function () {
        const source = new TMSSource(paramsTMS);
        const extent = new Extent('WMTS:PM', 5, 0, 0);
        assert.ok(source.isTMSSource);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
        assert.ok(source.extentsInsideLimit([extent, extent]));
    });
    it('Should instance and use FileSource', function () {
        Fetcher.text = function () { return geojson.promise; };
        const source = new FileSource({
            url: '..',
            projection: 'EPSG:4326',
        }, 'EPSG:4326');

        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        source.whenReady.then(() => assert.equal(source.parsedData.features[0].geometry.length, 3));
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.isFileSource);
    });
    it('Should instance and use StaticSource', function () {
        Fetcher.json = function () { return Promise.resolve({}); };
        const source = new StaticSource({
            url: 'http://itowns.org',
            extent: [-90, 90, -45, 45],
            projection: 'EPSG:4326',
        });
        assert.ok(source.isStaticSource);
    });
});
