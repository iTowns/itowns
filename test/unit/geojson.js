import proj4 from 'proj4';
import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Extent from 'Core/Geographic/Extent';

import holes from '../data/geojson/holes.geojson';
import gpx from '../data/geojson/gpx.geojson';
import points from '../data/geojson/points.geojson';

proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function parse(geojson) {
    return GeoJsonParser.parse(geojson, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true, structure: '3d' } });
}

describe('GeoJsonParser', function () {
    it('should set all z coordinates to 0', function (done) {
        parse(holes)
            .then((collection) => {
                assert.ok(collection.features[0].vertices.every((v, i) => ((i + 1) % 3) != 0 || (v + collection.position.z) == 0));
                done();
            }).catch(done);
    });

    it('should respect all z coordinates', function (done) {
        parse(gpx)
            .then((collection) => {
                assert.ok(collection.features[0].vertices.every((v, i) => ((i + 1) % 3) != 0 || (v + collection.position.z) != 0));
                done();
            }).catch(done);
    });

    it('should detect if there is the raw elevation data', function (done) {
        parse(gpx)
            .then((collection) => {
                assert.ok(collection.features[0].hasRawElevationData);
                done();
            }).catch(done);
    });

    it('should detect if there is not the raw elevation data', function (done) {
        parse(holes)
            .then((collection) => {
                assert.ok(!collection.features[0].hasRawElevationData);
                done();
            }).catch(done);
    });

    it('should return an empty collection', function (done) {
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                filteringExtent: new Extent('EPSG:3946', 10, 20, 10, 20),
            },
        })
            .then((collection) => {
                assert.ok(collection.features.length == 0);
                done();
            }).catch(done);
    });

    it('should return an merged collection', function (done) {
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                mergeFeatures: true,
            },
        })
            .then((collection) => {
                assert.ok(collection.features.length == 1);
                done();
            }).catch(done);
    });

    it('should return an no merged collection', function (done) {
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                mergeFeatures: false,
            },
        })
            .then((collection) => {
                assert.ok(collection.features.length == 3);
                done();
            }).catch(done);
    });

    it('should return an collection without altitude and normal', function (done) {
        GeoJsonParser.parse(holes, {
            in: {
                crs: 'EPSG:3946',
            },
            out: {
                crs: 'EPSG:3946',
                structure: '2d',
            },
        })
            .then((collection) => {
                assert.ok(collection.features[0].vertices.length == 32);
                assert.ok(collection.features[0].normals == undefined);
                done();
            }).catch(done);
    });

    it('parses Point and MultiPoint', function (done) {
        GeoJsonParser.parse(points, {
            in: {
                crs: 'EPSG:4326',
            },
            out: {
                crs: 'EPSG:4326',
                mergeFeatures: false,
            },
        })
            .then((collection) => {
                assert.equal(collection.features.length, 3);
                assert.equal(collection.features[0].geometries.length, 1);
                assert.equal(collection.features[1].geometries.length, 1);
                assert.equal(collection.features[2].geometries.length, 5);
                done();
            }).catch(done);
    });
});
