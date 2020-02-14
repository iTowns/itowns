import assert from 'assert';
import Feature, { FEATURE_TYPES } from 'Core/Feature';
import Coordinates from 'Core/Geographic/Coordinates';

describe('Feature', function () {
    const options_A = {
        withNormal: true,
        withAltitude: true,
        buildExtent: true,
    };

    const coord = new Coordinates('EPSG:4326', 0, 0, 0);

    it('Should instance Features', function () {
        const featurePoint = new Feature(FEATURE_TYPES.POINT, 'EPSG:4326');
        const featureLine = new Feature(FEATURE_TYPES.LINE, 'EPSG:4326');
        const featurePolygon = new Feature(FEATURE_TYPES.POLYGON, 'EPSG:4326');
        assert.equal(featurePoint.type, FEATURE_TYPES.POINT);
        assert.equal(featureLine.type, FEATURE_TYPES.LINE);
        assert.equal(featurePolygon.type, FEATURE_TYPES.POLYGON);
    });

    it('Should bind FeatureGeometry', function () {
        const featureLine = new Feature(FEATURE_TYPES.LINE, 'EPSG:4326');
        featureLine.bindNewGeometry();
        assert.equal(featureLine.geometryCount, 1);
    });

    it('Should instance Features with options', function () {
        const featureLine_A = new Feature(FEATURE_TYPES.LINE, 'EPSG:4326', options_A);
        const featureLine_B = new Feature(FEATURE_TYPES.LINE, 'EPSG:4326');

        assert.equal(featureLine_A.size, 3);
        assert.ok(featureLine_A.normals);
        assert.ok(featureLine_A.extent);

        assert.equal(featureLine_B.size, 2);
        assert.ok(!featureLine_B.normals);
        assert.ok(!featureLine_B.extent);
    });

    it('Should push Coordinates in Feature Geometry', function () {
        const featureLine = new Feature(FEATURE_TYPES.LINE, 'EPSG:3857', options_A);
        const geometry = featureLine.bindNewGeometry();

        coord.setFromValues(-10, -10, 0);
        geometry.pushCoordinates(coord, featureLine);
        coord.setFromValues(10, 10, 0);
        geometry.pushCoordinates(coord, featureLine);
        geometry.closeSubGeometry(2, featureLine);

        featureLine.updateExtent(geometry);

        assert.equal(featureLine.extent.south, -1118889.9748579601);
        assert.equal(featureLine.vertices.length, geometry.indices[0].count * featureLine.size);
        assert.equal(featureLine.vertices.length, featureLine.normals.length);
    });
});
