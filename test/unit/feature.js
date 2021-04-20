import assert from 'assert';
import Feature, { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import Coordinates from 'Core/Geographic/Coordinates';

describe('Feature', function () {
    const options_A = {
        structure: '3d',
        buildExtent: true,
        crs: 'EPSG:4326',
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
        const collection_A = new FeatureCollection(options_A);
        const collection_B = new FeatureCollection({ crs: 'EPSG:4326' });

        const featureLine_A = collection_A.requestFeatureByType(FEATURE_TYPES.LINE);
        const featureLine_B = collection_B.requestFeatureByType(FEATURE_TYPES.LINE);

        assert.equal(featureLine_A.size, 3);
        assert.ok(featureLine_A.normals);
        assert.ok(featureLine_A.extent);

        assert.equal(featureLine_B.size, 2);
        assert.ok(!featureLine_B.normals);
        assert.ok(!featureLine_B.extent);
    });

    it('Should push Coordinates in Feature Geometry', function () {
        const collection_A = new FeatureCollection({ crs: 'EPSG:3857', buildExtent: true, structure: '3d' });

        const featureLine = collection_A.requestFeatureByType(FEATURE_TYPES.LINE);
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
