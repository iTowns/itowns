import assert from 'assert';
import Feature from 'Core/Feature';
import Coordinates from 'Core/Geographic/Coordinates';


const options_A = {
    withNormal: true,
    withAltitude: true,
    buildExtent: true,
};

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

describe('Feature', function () {
    it('Should instance Features', function () {
        const featurePoint = new Feature('point', 'EPSG:4326');
        const featureLine = new Feature('line', 'EPSG:4326');
        const featurePolygon = new Feature('polygon', 'EPSG:4326');
        assert.equal(featurePoint.type, 'point');
        assert.equal(featureLine.type, 'line');
        assert.equal(featurePolygon.type, 'polygon');
    });

    it('Should bind FeatureGeometry', function () {
        const featureLine = new Feature('line', 'EPSG:4326');
        featureLine.bindNewGeometry();
        assert.equal(featureLine.geometryCount, 1);
    });

    it('Should instance Features with options', function () {
        const featureLine_A = new Feature('line', 'EPSG:4326', options_A);
        const featureLine_B = new Feature('line', 'EPSG:4326');

        assert.equal(featureLine_A.size, 3);
        assert.ok(featureLine_A.normals);
        assert.ok(featureLine_A.extent);

        assert.equal(featureLine_B.size, 2);
        assert.ok(!featureLine_B.normals);
        assert.ok(!featureLine_B.extent);
    });

    it('Should push Coordinates in Feature Geometry', function () {
        const featureLine = new Feature('line', 'EPSG:3857', options_A);
        const geometry = featureLine.bindNewGeometry();

        coord.set('EPSG:4326', -10, -10, 0);
        geometry.pushCoordinates(coord);
        coord.set('EPSG:4326', 10, 10, 0);
        geometry.pushCoordinates(coord);
        geometry.closeSubGeometry(2);

        featureLine.updateExtent(geometry);

        assert.equal(featureLine.extent.south, -1118889.9748579601);
        assert.equal(featureLine.vertices.length, geometry.indices[0].count * featureLine.size);
        assert.equal(featureLine.vertices.length, featureLine.normals.length);
    });
});
