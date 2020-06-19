import proj4 from 'proj4';
import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Extent from 'Core/Geographic/Extent';

const holes = require('../data/geojson/holes.geojson.json');
const gpx = require('../data/geojson/gpx.geojson.json');
const simple = require('../data/geojson/simple.geojson.json');

proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function parse(geojson) {
    return GeoJsonParser.parse(geojson, { crsIn: 'EPSG:3946', crsOut: 'EPSG:3946', buildExtent: true });
}

describe('GeoJsonParser', function () {
    it('sets all z coordinates to 1', () =>
        parse(holes).then((collection) => {
            assert.ok(collection.features[0].vertices.every((v, i) => i == 0 || ((i + 1) % 3) != 0 || v == 0));
        }));

    it('respects all z coordinates', () =>
        parse(gpx).then((collection) => {
            assert.ok(collection.features[0].vertices.every((v, i) => i == 0 || ((i + 1) % 3) != 0 || v != 0));
        }));

    it('returns an empty collection', () =>
        GeoJsonParser.parse(holes, {
            crsIn: 'EPSG:3946',
            crsOut: 'EPSG:3946',
            buildExtent: true,
            filteringExtent: new Extent('EPSG:3946', 10, 20, 10, 20),
        }).then((collection) => {
            assert.equal(collection.features.length, 0);
        }));

    it('returns an merged collection', () =>
        GeoJsonParser.parse(holes, {
            crsIn: 'EPSG:3946',
            crsOut: 'EPSG:3946',
            mergeFeatures: true,
        }).then((collection) => {
            assert.equal(collection.features.length, 1);
        }));

    it('returns an no merged collection', () =>
        GeoJsonParser.parse(holes, {
            crsIn: 'EPSG:3946',
            crsOut: 'EPSG:3946',
            mergeFeatures: false,
        }).then((collection) => {
            assert.equal(collection.features.length, 3);
        }));

    it('returns an collection without altitude', () =>
        GeoJsonParser.parse(holes, {
            crsIn: 'EPSG:3946',
            crsOut: 'EPSG:3946',
            withAltitude: false,
        }).then((collection) => {
            assert.equal(collection.features[0].vertices.length, 32);
        }));

    it('returns an collection without normal', () =>
        GeoJsonParser.parse(holes, {
            crsIn: 'EPSG:3946',
            crsOut: 'EPSG:3946',
            withNormal: false,
        }).then((collection) => {
            assert.equal(collection.features[0].normals, undefined);
        }));

    it('parses a string correctly', () =>
        GeoJsonParser.parse('{ "type": "FeatureCollection", "features": [ { "type": "Feature", "geometry": { "type": "Point", "coordinates": [ 1.2637939397245646, 42.91620643817353 ] }, "properties": { "name": "testPoint" } } ] }', {
            crsIn: 'EPSG:4978',
            crsOut: 'EPSG:4978',
        }).then((collection) => {
            assert.equal(collection.features.length, 1);
        }));

    describe('reads the CRS from the geojson', function () {
        after(() => {
            simple.crs = undefined;
        });

        it('using crs.type = epsg', () => {
            simple.crs = { type: 'EPSG', properties: { code: 4978 } };
            return GeoJsonParser.parse(simple, {
                crsOut: 'EPSG:4978',
            }).then((collection) => {
                assert.equal(collection.crs, 'EPSG:4978');
            });
        });


        it('using crs.type = name', () => {
            simple.crs = { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4978' } };
            return GeoJsonParser.parse(simple, {
                crsOut: 'EPSG:4978',
            }).then((collection) => {
                assert.equal(collection.crs, 'EPSG:4978');
            });
        });

        it('using invalid crs.type', () => {
            simple.crs = { type: 'invalid' };
            assert.throws(() => GeoJsonParser.parse(simple, {
                crsOut: 'EPSG:4978',
            }), Error);
        });
    });

    it('filters from properties', () =>
        GeoJsonParser.parse(simple, {
            crsIn: 'EPSG:4978',
            crsOut: 'EPSG:4978',
            buildExtent: true,
            filter: (properties, geometry) => {
                if (properties.filteringName !== 'no') {
                    return geometry;
                }
            },
        }).then((collection) => {
            assert.equal(collection.features.length, 2);
        }));
});
