import proj4 from 'proj4';
import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Extent from 'Core/Geographic/Extent';

const holes = require('../data/geojson/holes.geojson.json');
const gpx = require('../data/geojson/gpx.geojson.json');
const points = require('../data/geojson/points.geojson.json');

proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function parse(geojson) {
    return GeoJsonParser.parse(geojson, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true } });
}

describe('GeoJsonParser', function () {
    it('should set all z coordinates to 1', () =>
        parse(holes).then((collection) => {
            assert.ok(collection.features[0].vertices.every((v, i) => i == 0 || ((i + 1) % 3) != 0 || v == 0));
        }));

    it('should respect all z coordinates', () =>
        parse(gpx).then((collection) => {
            assert.ok(collection.features[0].vertices.every((v, i) => i == 0 || ((i + 1) % 3) != 0 || v != 0));
        }));

    it('should return an empty collection', () =>
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                buildExtent: true,
                filteringExtent: new Extent('EPSG:3946', 10, 20, 10, 20),
            },
        }).then((collection) => {
            assert.ok(collection.features.length == 0);
        }));
    it('should return an merged collection', () =>
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                mergeFeatures: true,
            },
        }).then((collection) => {
            assert.ok(collection.features.length == 1);
        }));
    it('should return an no merged collection', () =>
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                mergeFeatures: false,
            },
        }).then((collection) => {
            assert.ok(collection.features.length == 3);
        }));
    it('should return an collection without altitude', () =>
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                withAltitude: false,
            },
        }).then((collection) => {
            assert.ok(collection.features[0].vertices.length == 32);
        }));
    it('should return an collection without normal', () =>
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                withNormal: false,
            },
        }).then((collection) => {
            assert.ok(collection.features[0].normals == undefined);
        }));

    it('parses Point and MultiPoint', () =>
        GeoJsonParser.parse(points, {
            in: {
                crs: 'EPSG:4326',
            },
            out: {
                crs: 'EPSG:4326',
                mergeFeatures: false,
            },
        }).then((collection) => {
            assert.equal(collection.features.length, 3);
            assert.equal(collection.features[0].geometries.length, 1);
            assert.equal(collection.features[1].geometries.length, 1);
            assert.equal(collection.features[2].geometries.length, 5);
        }));
});
