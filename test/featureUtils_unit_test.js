import GeoJsonParser from '../src/Parser/GeoJsonParser';
import FeaturesUtils from '../src/Renderer/ThreeExtended/FeaturesUtils';
import Coordinates from '../src/Core/Geographic/Coordinates';
/* global describe, it */

const assert = require('assert');
const geojson = require('./data/geojson/simple.geojson.json');

const promise = GeoJsonParser.parse(geojson, { crsOut: 'EPSG:4326', buildExtent: true });

describe('FeaturesUtils', function () {
    it('should correctly parse geojson', () =>
        promise.then((feature) => {
            assert.equal(feature.length, 3);
        }));
    it('should correctly compute extent geojson', () =>
        promise.then((feature) => {
            assert.equal(feature.extent.west(), 0.30798339284956455);
            assert.equal(feature.extent.east(), 2.4722900334745646);
            assert.equal(feature.extent.south(), 42.91620643817353);
            assert.equal(feature.extent.north(), 43.72744458647463);
        }));
    it('should correctly filter point', () =>
        promise.then((feature) => {
            const coordinates = new Coordinates('EPSG:4326', 1.26, 42.9);
            const filter = FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, feature, 0.1);
            assert.equal(filter.length, 1.0);
            assert.equal(filter[0].feature.geometry.type == 'point', 1.0);
        }));
    it('should correctly filter polygon', () =>
        promise.then((feature) => {
            const coordinates = new Coordinates('EPSG:4326', 0.62, 43.52);
            const filter = FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, feature, 0.1);
            assert.equal(filter.length, 1.0);
            assert.equal(filter[0].feature.geometry.type == 'polygon', 1.0);
        }));
    it('should correctly filter line', () =>
        promise.then((feature) => {
            const coordinates = new Coordinates('EPSG:4326', 2.23, 43.39);
            const filter = FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, feature, 0.1);
            assert.equal(filter.length, 1.0);
            assert.equal(filter[0].feature.geometry.type == 'linestring', 1.0);
        }));
    it('should remember individual feature properties', () =>
        promise.then((feature) => {
            assert.equal(feature[2].properties.my_prop, 14);
        }));
});
