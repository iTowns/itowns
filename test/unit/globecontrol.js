import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import Renderer from './mock';

const renderer = new Renderer();

const positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 250000 };
const viewer = new GlobeView(renderer.domElement, positionOnGlobe, { renderer });

const event = {
    stopPropagation: () => {},
    preventDefault: () => {},
    button: THREE.MOUSE.LEFT,
};

describe('GlobeControls', function () {
    it('instance GlobeControls', function () {
        assert.ok(viewer.controls);
    });
    it('Set Tilt', function (done) {
        viewer.controls.setTilt(10, false).then((e) => {
            assert.equal(e.tilt, 10);
            done();
        });
    });
    it('update', function () {
        viewer.controls._mouseToPan(10, 10);
        viewer.controls.update();
    });
    it('mouse down', function () {
        renderer.domElement.emitEvent('mousedown', event);
        renderer.domElement.emitEvent('mousemove', event);
        renderer.domElement.emitEvent('mouseup', event);
    });
    it('dolly', function () {
        viewer.controls.dollyIn();
        viewer.controls.dollyOut();
    });
    it('mouse down + crtl', function () {
        event.keyCode = 17;
        renderer.domElement.emitEvent('keydown', event);
        renderer.domElement.emitEvent('mousedown', event);
        renderer.domElement.emitEvent('mousemove', event);
        renderer.domElement.emitEvent('mouseup', event);
        renderer.domElement.emitEvent('keyup', event);
    });
    it('mouse wheel', function () {
        renderer.domElement.emitEvent('mousewheel', event);
    });
    it('mouse dblclick', function () {
        renderer.domElement.emitEvent('dblclick', event);
    });

    event.touches = [1, 1];
    it('touch start', function () {
        renderer.domElement.emitEvent('touchstart', event);
    });

    it('touch move', function () {
        renderer.domElement.emitEvent('touchmove', event);
    });

    it('touch end', function () {
        renderer.domElement.emitEvent('touchend', event);
    });
});
