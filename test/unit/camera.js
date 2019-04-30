import assert from 'assert';
import Camera from 'Renderer/Camera';
import Coordinates from 'Core/Geographic/Coordinates';


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
        assert.ok(resultCoordinates.longitude == coordinates.longitude);
        assert.ok(resultCoordinates.latitude.toFixed(8) == coordinates.latitude);
        assert.ok(resultCoordinates.altitude.toFixed(8) == coordinates.altitude);
    });
});
