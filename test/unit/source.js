import assert from 'assert';
import fs from 'fs';
import Path from 'path';
import Source from '../../src/Source/Source';
import WMTSSource from '../../src/Source/WMTSSource';
import WMSSource from '../../src/Source/WMSSource';
import TMSSource from '../../src/Source/TMSSource';
import FileSource from '../../src/Source/FileSource';
import StaticSource from '../../src/Source/StaticSource';
import Fetcher from '../../src/Provider/Fetcher';
import Extent from '../../src/Core/Geographic/Extent';

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
    protocol: 'wms',
    format: 'image/png',
    extent: [-90, 90, -45, 45],
    projection: 'EPSG:4326',
};

const paramsWMTS = {
    url: 'http://',
    name: 'name',
    protocol: 'wmts',
    format: 'image/png',
};

const paramsTMS = {
    url: 'http://',
    protocol: 'tms',
};

describe('Source', function () {
    it('Should instance and throw error for Source', function () {
        const source = new Source({
            url: 'http://',
            protocol: 'unknow' });
        assert.ok(source.protocol);
        assert.throws(source.urlFromExtent, Error);
        assert.throws(source.extentInsideLimit, Error);
        assert.throws(source.extentsInsideLimit, Error);
    });
    it('Should instance and use WMTSSource', function () {
        const source = new WMTSSource(paramsWMTS);
        const extent = new Extent('WMTS:PM', 5, 0, 0);
        assert.ok(source.protocol);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
        assert.ok(source.extentsInsideLimit([extent, extent]));
    });
    it('Should instance and use WMSSource', function () {
        const source = new WMSSource(paramsWMS);
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        assert.ok(source.protocol);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
        assert.ok(source.extentsInsideLimit([extent, extent]));
    });
    it('Should instance and use TMSSource', function () {
        const source = new TMSSource(paramsTMS);
        const extent = new Extent('WMTS:PM', 5, 0, 0);
        assert.ok(source.protocol);
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.extentInsideLimit(extent));
        assert.ok(source.extentsInsideLimit([extent, extent]));
    });
    it('Should instance and use FileSource', function () {
        Fetcher.text = function () { return geojson.promise; };
        const source = new FileSource({
            url: '..',
            protocol: 'file',
            projection: 'EPSG:4326',
        }, 'EPSG:4326');

        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        source.whenReady.then(() => assert.equal(source.parsedData.features[0].geometry.length, 3));
        assert.ok(source.urlFromExtent(extent));
        assert.ok(source.protocol);
    });
    it('Should instance and use StaticSource', function () {
        Fetcher.json = function () { return Promise.resolve({}); };
        const source = new StaticSource({
            url: 'http://itowns.org',
            protocol: 'file',
            extent: [-90, 90, -45, 45],
            projection: 'EPSG:4326',
        });
        assert.ok(source.protocol);
    });
});
