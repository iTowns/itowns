import { MOUSE } from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import { getLookAtFromMath, getRig } from 'Utils/CameraUtils';
import Renderer from './bootstrap';

describe('GlobeControls', function () {
    const renderer = new Renderer();

    const placement = { coord: new Coordinates('EPSG:4326', 2.351323, 48.856712), range: 250000, proxy: false };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });
    const controls = viewer.controls;

    viewer.getPickingPositionFromDepth = (coords, pickingPoint) => {
        viewer.camera.camera3D.updateMatrixWorld();
        const lookAt = getLookAtFromMath(viewer, viewer.camera.camera3D);
        if (lookAt) {
            if (pickingPoint) {
                pickingPoint.copy(lookAt);
            }
            return lookAt;
        }
    };

    controls.enableDamping = false;

    const touche = {
        clientX: 200,
        clientY: 150,
        pageX: 200,
        pageY: 150,
    };

    const event = {
        stopPropagation: () => {},
        preventDefault: () => {},
        button: MOUSE.LEFT,
        touches: [touche],
    };

    it('instance GlobeControls', function () {
        assert.ok(controls);
    });

    it('pickGeoPosition', function () {
        const pick = controls.pickGeoPosition();
        assert.equal((placement.coord.longitude / pick.longitude).toFixed(8), 1);
        assert.equal((placement.coord.latitude / pick.latitude).toFixed(8), 1);
    });

    const tilt = 10;
    const heading = 4;

    it('Set tilt', function (done) {
        controls.setTilt(tilt, false).then((e) => {
            assert.equal(e.tilt, tilt);
            assert.equal((tilt / controls.getTilt()).toFixed(8), 1);
            done();
        });
    });

    it('Set heading', function (done) {
        controls.setHeading(heading, false).then((e) => {
            assert.equal(e.heading, heading);
            assert.equal((heading / controls.getHeading()).toFixed(8), 1);
            done();
        });
    });

    it('getCameraOrientation', function () {
        const orientation = controls.getCameraOrientation();
        assert.equal((heading / orientation[1]).toFixed(8), 1);
        assert.equal((tilt / orientation[0]).toFixed(8), 1);
    });

    it('getCameraCoordinate', function () {
        const coord = controls.getCameraCoordinate();
        assert.ok(coord.z > 20000);
    });

    it('Get range', function () {
        const range = controls.getRange();
        assert.equal((placement.range / range).toFixed(8), 1);
    });

    it('Set zoom', function (done) {
        const zoom = 10;
        controls.setZoom(zoom, false).then(() => {
            assert.equal(zoom, controls.getZoom());
            done();
        });
    });

    it('Set range', function (done) {
        const range = 1000;
        controls.setRange(range, false).then((e) => {
            assert.equal((e.range / range).toFixed(8), 1);
            done();
        });
    });

    it('Set scale', function (done) {
        const scale = 0.0002;
        controls.setScale(scale, 0.28, false).then(() => {
            assert.equal((viewer.getScale() / scale).toFixed(8), 1);
            done();
        });
    });

    it('update', function () {
        const c1 = controls.getLookAtCoordinate();
        controls.mouseToPan(100, 100);
        controls.state = controls.states.PAN;
        controls.update();
        controls.state = controls.states.NONE;
        const c2 = controls.getLookAtCoordinate();
        assert.ok(c1.longitude > c2.longitude);
        assert.ok(c1.latitude < c2.latitude);
    });

    it('isPaused', function () {
        controls.state = controls.states.NONE;
        assert.ok(controls.isPaused);
        controls.state = controls.states.PANORAMIC;
        assert.ok(!controls.isPaused);
        controls.state = controls.states.NONE;
    });

    it('keydown', function () {
        event.keyCode = controls.states.PAN.up;
        controls.onKeyDown(event);
        assert.equal(controls.state, controls.states.PAN);
        event.keyCode = controls.states.PAN.bottom;
        controls.onKeyDown(event);
        assert.equal(controls.state, controls.states.PAN);
        event.keyCode = controls.states.PAN.left;
        controls.onKeyDown(event);
        assert.equal(controls.state, controls.states.PAN);
        event.keyCode = controls.states.PAN.right;
        controls.onKeyDown(event);
        assert.equal(controls.state, controls.states.PAN);
    });

    it('mouse down', function () {
        controls.onKeyUp();
        controls.onMouseDown(event);
        assert.ok(controls.state == controls.states.MOVE_GLOBE);
        controls.onMouseMove(event);
        controls.onMouseUp(event);
        assert.ok(controls.state == controls.states.NONE);
    });

    it('dolly', function () {
        controls.dollyIn(10);
        controls.state = controls.states.ORBIT;
        controls.update();
        controls.dollyOut(10);
        controls.state = controls.states.NONE;
        controls.dollyOut();
        controls.dollyIn();
    });

    it('mouse down + crtl', function () {
        event.keyCode = 17;
        controls.onKeyDown(event);
        assert.ok(controls.states.NONE == controls.state);
        controls.onMouseDown(event);
        assert.ok(controls.states.ORBIT == controls.state);
        controls.onMouseMove(event);
        assert.ok(controls.states.ORBIT == controls.state);
        controls.onMouseUp(event);
        assert.ok(controls.states.NONE == controls.state);
        controls.onKeyUp(event);
        assert.ok(controls.states.NONE == controls.state);
    });

    it('mouse wheel', function () {
        const startRange = controls.getRange();
        event.wheelDelta = -10;
        controls.onMouseWheel(event);
        assert.ok(controls.getRange() > startRange);
        event.wheelDelta = 10;
        controls.onMouseWheel(event);
        controls.onMouseWheel(event);
        assert.ok(controls.getRange() < startRange);
    });

    it('mouse dblclick', function (done) {
        controls.setAnimationEnabled(false);
        const startRange = controls.getRange();
        controls.ondblclick(event).then(() => {
            assert.ok(controls.getRange() < startRange);
            done();
        });
    });

    it('touch start', function () {
        controls.onTouchStart(event);
        assert.ok(controls.states.MOVE_GLOBE == controls.state);
    });

    it('touch one move', function () {
        controls.onTouchMove(event);
        assert.ok(controls.states.MOVE_GLOBE == controls.state);
    });

    it('touch two moves', function () {
        controls.states.DOLLY.finger = 2;
        event.touches.push(touche);
        controls.onTouchMove(event);
    });

    it('onContextMenuListener', function () {
        controls.onContextMenuListener(event);
    });

    it('onBlurListener', function () {
        controls.state = controls.states.MOVE_GLOBE;
        controls.onBlurListener(event);
        assert.ok(controls.states.NONE == controls.state);
    });

    it('lookAtCoordinate with animation', function (done) {
        const rig = getRig(viewer.camera.camera3D);
        let i;
        controls.lookAtCoordinate({ coord: placement.coord, time: 10 }, true).then((e) => {
            assert.equal((e.coord.longitude / placement.coord.longitude).toFixed(8), 1);
            assert.equal((e.coord.latitude / placement.coord.latitude).toFixed(8), 1);
            clearInterval(i);
            done();
        });

        if (rig.animationFrameRequester) {
            i = setInterval(rig.animationFrameRequester, 10);
        }
    });

    it('mouse down enableDamping', function () {
        controls.enableDamping = true;
        controls.onKeyUp();
        controls.onMouseDown(event);
        assert.ok(controls.state == controls.states.MOVE_GLOBE);
        controls.onMouseMove(event);
        controls.onMouseUp(event);
        assert.ok(controls.state == controls.states.MOVE_GLOBE);
    });

    it('dispose', function () {
        controls.dispose();
    });
});
