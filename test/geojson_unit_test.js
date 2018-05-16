import proj4 from 'proj4';
import GeoJsonParser from '../src/Parser/GeoJsonParser';
/* global describe, it */

const assert = require('assert');
const holes = require('./data/geojson/holes.geojson.json');
const gpx = require('./data/geojson/gpx.geojson.json');

proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function parse(geojson) {
    return GeoJsonParser.parse(geojson, { crsIn: 'EPSG:3946', crsOut: 'EPSG:3946', buildExtent: true });
}

describe('GeoJsonParser', function () {
    it('should set all z coordinates to 1', () =>
        parse(holes).then((collection) => {
            assert.ok(collection.features[0].vertices.every(v => v.z() == 1));
        }));

    it('should respect all z coordinates', () =>
        parse(gpx).then((collection) => {
            assert.ok(collection.features[0].vertices.every(v => v.z() != 1));
        }));
});
