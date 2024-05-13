import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import FeaturesUtils from 'Utils/FeaturesUtils';
import Coordinates from 'Core/Geographic/Coordinates';
import { FEATURE_TYPES } from 'Core/Feature';

import geojson from '../data/geojson/simple.geojson';

describe('FeaturesUtils', function () {
    const options = { out: { crs: 'EPSG:4326', buildExtent: true, mergeFeatures: false, structure: '3d' } };
    const promise = GeoJsonParser.parse(geojson, options);
    it('should correctly parse geojson', function (done) {
        promise.then((collection) => {
            assert.equal(collection.features.length, 3);
            done();
        }).catch(done);
    });

    it('should correctly compute extent geojson', function (done) {
        promise.then((collection) => {
            const extent = collection.extent.clone().applyMatrix4(collection.matrix);
            assert.equal(extent.west, 0.30798339284956455);
            assert.equal(extent.east, 2.4722900334745646);
            assert.equal(extent.south, 42.91620643817353);
            assert.equal(extent.north, 43.72744458647463);
            done();
        }).catch(done);
    });

    it('should correctly filter point', function (done) {
        promise.then((collection) => {
            const coordinates = new Coordinates('EPSG:4326', 1.26, 42.9);
            const filter = FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, collection, 0.1);
            assert.equal(filter.length, 1.0);
            assert.equal(filter[0].type == FEATURE_TYPES.POINT, 1.0);
            done();
        }).catch(done);
    });

    it('should correctly filter polygon', function (done) {
        promise.then((feature) => {
            const coordinates = new Coordinates('EPSG:4326', 0.62, 43.52);
            const filter = FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, feature, 0.1);
            assert.equal(filter.length, 1.0);
            assert.equal(filter[0].type == FEATURE_TYPES.POLYGON, 1.0);
            done();
        }).catch(done);
    });

    it('should correctly filter line', function (done) {
        promise.then((feature) => {
            const coordinates = new Coordinates('EPSG:4326', 2.23, 43.39);
            const filter = FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, feature, 0.1);
            assert.equal(filter.length, 1.0);
            assert.equal(filter[0].type == FEATURE_TYPES.LINE, 1.0);
            done();
        }).catch(done);
    });

    it('should remember individual feature properties', function (done) {
        promise.then((collection) => {
            assert.equal(collection.features[2].geometries[0].properties.my_prop, 14);
            done();
        }).catch(done);
    });
});
