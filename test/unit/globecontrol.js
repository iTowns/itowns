import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import Renderer from './mock';

const renderer = new Renderer();

const positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 250000 };
const viewer = new GlobeView('EPSG:4326', positionOnGlobe, { renderer });

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
    it('mouse down', function (done) {
        renderer.domElement.emitEvent('mousedown', event).then(() => {
            renderer.domElement.emitEvent('mousemove', event);
            renderer.domElement.emitEvent('mouseup', event);
            done();
        });
    });
    it('dolly', function () {
        viewer.controls.dollyIn();
        viewer.controls.dollyOut();
    });
    it('mouse down + crtl', function (done) {
        event.keyCode = 17;
        renderer.domElement.emitEvent('keydown', event).then(() => {
            renderer.domElement.emitEvent('mousedown', event).then(() => {
                renderer.domElement.emitEvent('mousemove', event);
                renderer.domElement.emitEvent('mouseup', event);
                renderer.domElement.emitEvent('keyup', event);
                done();
            });
        });
    });
    it('mouse wheel', function (done) {
        renderer.domElement.emitEvent('mousewheel', event).then(() => {
            done();
        });
    });
    it('mouse dblclick', function (done) {
        renderer.domElement.emitEvent('dblclick', event).then(() => {
            done();
        });
    });

    event.touches = [1, 1];
    it('touch start', function (done) {
        renderer.domElement.emitEvent('touchstart', event).then(() => {
            done();
        });
    });

    it('touch move', function () {
        renderer.domElement.emitEvent('touchmove', event);
    });

    it('touch end', function () {
        renderer.domElement.emitEvent('touchend', event);
    });
});
