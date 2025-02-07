import assert from 'assert';
import Camera, { CAMERA_TYPE } from 'Renderer/Camera';
import { Coordinates } from '@itowns/geographic';
import { compareWithEpsilon } from './utils';

describe('camera', function () {
    it('should set good aspect in camera3D', function () {
        const camera = new Camera('', 100, 50);
        assert.ok(camera.camera3D.aspect == 2.0);
    });
    it('should increase preSSE when fov decrease', function () {
        const camera = new Camera('', 100, 50);

        camera.resize(100, 50);
        const initial = camera._preSSE;

        camera.camera3D.fov *= 0.5;

        assert.ok(camera._preSSE > initial);
    });
    it('should be consistent between setPosition and position', function () {
        const camera = new Camera('EPSG:4978', 100, 50);
        const coordinates = new Coordinates('EPSG:4326', 40, 52, 2002);
        camera.setPosition(coordinates);
        const resultCoordinates = camera.position('EPSG:4326');
        assert.ok(compareWithEpsilon(resultCoordinates.longitude, coordinates.longitude, 10e-8));
        assert.ok(compareWithEpsilon(resultCoordinates.latitude, coordinates.latitude, 10e-8));
        assert.ok(compareWithEpsilon(resultCoordinates.altitude, coordinates.altitude, 10e-8));
    });
    it('should correctly resize camera', function () {
        const dimensions = { width: 78, height: 89 };

        const cameraPerspective = new Camera(
            'EPSG:4978',
            100, 50,
        );
        cameraPerspective.resize(dimensions.width, dimensions.height);
        assert.equal(cameraPerspective.width, dimensions.width);
        assert.equal(cameraPerspective.height, dimensions.height);

        const cameraOrthographic = new Camera(
            'EPSG:4978',
            100, 50,
            { type: CAMERA_TYPE.ORTHOGRAPHIC },
        );
        cameraOrthographic.resize(dimensions.width, dimensions.height);
        assert.equal(cameraOrthographic.width, dimensions.width);
        assert.equal(cameraOrthographic.height, dimensions.height);
    });
});
