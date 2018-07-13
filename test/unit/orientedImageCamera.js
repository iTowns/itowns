import * as THREE from 'three';
import assert from 'assert';
import OrientedImageCamera from '../../src/Renderer/OrientedImageCamera';
/* global describe, it */

describe('oriented image camera', function () {
    it('Should have default values', () => {
        const cam = new OrientedImageCamera(); // size = 1024, focal = 1024
        assert.equal(cam.size.x, 1024, 'Default size.x should be 1024');
        assert.equal(cam.size.y, 1024, 'Default size.y should be 1024');
        assert.equal(cam.focal.x, 1024, 'Default focal.x should be 1024');
        assert.equal(cam.focal.y, 1024, 'Default focal.y should be 1024');

        assert.equal(true, cam.fov > 52 && cam.fov < 54, `Fov default should be between 53 and 54, here it's ${cam.fov}`);
    });

    it('updates its Fov is camera Size changes', () => {
        const cam = new OrientedImageCamera(); // size = 1024, focal = 1024

        assert.equal(true, cam.fov > 52 && cam.fov < 54, `Fov default should be between 53 and 54, here it's ${cam.fov}`);

        cam.size = new THREE.Vector2(2048, 2048);

        assert.equal(90, cam.fov, 'Fov should be 90');
    });

    it('updates its Fov if camera Focal changes', () => {
        const cam = new OrientedImageCamera(); // size = 1024, focal = 1024

        assert.equal(true, cam.fov > 52 && cam.fov < 54, `Fov default should be between 53 and 54, here it's ${cam.fov}`);

        cam.focal = new THREE.Vector2(512, 512);

        assert.equal(90, cam.fov, 'Fov should be 90');
    });
});
