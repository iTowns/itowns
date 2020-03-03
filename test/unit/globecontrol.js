import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import Renderer from './mock';

describe('GlobeControls', function () {
    const renderer = new Renderer();

    const placement = { coord: new Coordinates('EPSG:4326', 2.351323, 48.856712), range: 250000 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    const event = {
        stopPropagation: () => {},
        preventDefault: () => {},
        button: THREE.MOUSE.LEFT,
        touches: [{
            offsetX: 100,
            offsetY: 200,
            pageX: 150,
            pageY: 200,
        }],
    };

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
        viewer.controls.mouseToPan(10, 10);
        viewer.controls.update();
    });

    it('mouse down', function () {
        viewer.domElement.emitEvent('mousedown', event);

        event.touches = [{
            offsetX: 50,
            offsetY: 100,
            pageX: 100,
            pageY: 100,
        }];
        viewer.domElement.emitEvent('mousemove', event);
        viewer.domElement.emitEvent('mouseup', event);
    });

    it('dolly', function () {
        viewer.controls.dollyIn();
        viewer.controls.dollyOut();
    });

    it('mouse down + crtl', function () {
        event.keyCode = 17;
        viewer.domElement.emitEvent('keydown', event);
        viewer.domElement.emitEvent('mousedown', event);
        viewer.domElement.emitEvent('mousemove', event);
        viewer.domElement.emitEvent('mouseup', event);
        viewer.domElement.emitEvent('keyup', event);
    });

    it('mouse wheel', function () {
        viewer.domElement.emitEvent('mousewheel', event);
    });

    it('mouse dblclick', function () {
        viewer.domElement.emitEvent('dblclick', event);
    });

    it('touch start', function () {
        viewer.domElement.emitEvent('touchstart', event);
    });

    it('touch move', function () {
        viewer.domElement.emitEvent('touchmove', event);
    });

    it('touch end', function () {
        viewer.domElement.emitEvent('touchend', event);
    });
});
