import assert from 'assert';
import * as THREE from 'three';
import PlanarView from 'Core/Prefab/PlanarView';
import { CAMERA_TYPE } from 'Renderer/Camera';
import Extent from 'Core/Geographic/Extent';
import { keys, STATE } from 'Controls/PlanarControls';
import Renderer from './bootstrap';


describe('Planar Controls', function () {
    const renderer = new Renderer();
    const extent = new Extent('EPSG:4326', -100, 100, -100, 100);

    const viewPerspective = new PlanarView(renderer.domElement, extent, { renderer });
    const viewOrtho = new PlanarView(renderer.domElement, extent, { renderer, camera: { type: CAMERA_TYPE.ORTHOGRAPHIC } });

    const controlsPerspective = viewPerspective.controls;
    const controlsOrtho = viewOrtho.controls;

    const cameraPerspective = viewPerspective.camera3D;
    const cameraOrtho = viewOrtho.camera3D;

    const touche = {
        clientX: 50,
        clientY: 50,
        pageX: 50,
        pageY: 50,
    };

    const event = {
        stopPropagation: () => {},
        preventDefault() {},
        touches: [touche],
    };

    const cameraInitialPosition = new THREE.Vector3();
    let cameraInitialZoom = 1;

    function dragMouse(controls, camera) {
        cameraInitialPosition.copy(camera.position);
        controls.onMouseDown(event);

        event.touches[0].clientX += 10;
        event.touches[0].pageX += 10;
        controls.onMouseMove(event);
        controls.update(20, false);
        controls.onMouseUp(event);
    }

    function wheelMouse(controls, camera, wheelDelta) {
        cameraInitialPosition.copy(camera.position);
        if (camera.isOrthographicCamera) {
            cameraInitialZoom = camera.zoom;
        }

        event.deltaY = wheelDelta;
        controls.onMouseWheel(event);
        controls.update(20, false);
    }

    function smartTravel(controls, camera) {
        cameraInitialPosition.copy(camera.position);
        if (camera.isOrthographicCamera) {
            cameraInitialZoom = camera.zoom;
        }
        controls.onMouseDown(event);
        controls.update(20, false);
    }

    it('left-click should switch controls to DRAG state', function () {
        event.button = THREE.MOUSE.LEFT;
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.DRAG, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;
    });

    it('ctrl + left-click should switch controls to ROTATE state, unless rotation is disabled', function () {
        event.ctrlKey = true;

        // enabled rotation
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.ROTATE, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        // disabled rotation
        controlsPerspective.enableRotation = false;
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.NONE, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        // reset controls
        controlsPerspective.enableRotation = true;
        event.ctrlKey = false;
    });

    it('middle-click should switch controls to TRAVEL state, unless smart travel is disabled', function () {
        event.button = THREE.MOUSE.MIDDLE;

        // enabled smart travel
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.TRAVEL, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        // disabled smart travel
        controlsPerspective.enableSmartTravel = false;
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.NONE, controlsPerspective.state);

        // reset controls
        controlsPerspective.enableSmartTravel = true;
    });

    it('right-click should switch controls to PAN state, unless pan is disabled', function () {
        event.button = THREE.MOUSE.RIGHT;

        // enabled pan
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.PAN, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        // disabled pan
        controlsPerspective.enablePan = false;
        controlsPerspective.onMouseDown(event);
        assert.equal(STATE.NONE, controlsPerspective.state);

        // reset controls
        controlsPerspective.enablePan = true;
    });

    it('onMouseDown should not switch state if state is TRAVEL', function () {
        event.button = THREE.MOUSE.LEFT;
        controlsPerspective.state = STATE.TRAVEL;
        controlsPerspective.onMouseDown(event);
        assert.equal(controlsPerspective.state, STATE.TRAVEL);
        controlsPerspective.state = STATE.NONE;
    });

    it('onMouseUp should switch controls to the relevant state', function () {
        // STATE.DRAG
        event.button = THREE.MOUSE.LEFT;
        controlsPerspective.onMouseDown(event);
        controlsPerspective.onMouseUp(event);
        assert.equal(STATE.NONE, controlsPerspective.state);

        // STATE.ROTATE
        event.ctrlKey = true;
        controlsPerspective.onMouseDown(event);
        controlsPerspective.onMouseUp(event);
        assert.equal(STATE.NONE, controlsPerspective.state);
        event.ctrlKey = false;

        // STATE.PAN
        event.button = THREE.MOUSE.RIGHT;
        controlsPerspective.onMouseDown(event);
        controlsPerspective.onMouseUp(event);
        assert.equal(STATE.NONE, controlsPerspective.state);

        // STATE.TRAVEL
        event.button = THREE.MOUSE.MIDDLE;
        controlsPerspective.onMouseDown(event);
        controlsPerspective.onMouseUp(event);
        assert.equal(STATE.TRAVEL, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;
    });

    it('onKeyDown should trigger travel', function () {
        controlsPerspective.state = STATE.TRAVEL;
        controlsPerspective.onKeyDown(event);
        assert.equal(STATE.TRAVEL, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        event.keyCode = keys.T;
        controlsPerspective.onKeyDown(event);
        assert.equal(STATE.TRAVEL, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        event.keyCode = keys.Y;
        controlsPerspective.onKeyDown(event);
        assert.equal(STATE.TRAVEL, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;

        event.keyCode = keys.SPACE;
        controlsPerspective.onKeyDown(event);
        assert.equal(STATE.TRAVEL, controlsPerspective.state);
        controlsPerspective.state = STATE.NONE;
    });

    it('drag movement', function () {
        event.button = THREE.MOUSE.LEFT;

        dragMouse(controlsPerspective, cameraPerspective);

        // camera has moved
        assert.ok(!cameraPerspective.position.equals(cameraInitialPosition));
        // camera has not moved along the vertical axis
        assert.equal(cameraPerspective.position.z, cameraInitialPosition.z);
    });

    it('pan movement', function () {
        event.button = THREE.MOUSE.RIGHT;

        // enabled pan
        dragMouse(controlsPerspective, cameraPerspective);
        // camera has moved
        assert.ok(!cameraPerspective.position.equals(cameraInitialPosition));

        // disabled pan
        controlsPerspective.enablePan = false;
        dragMouse(controlsPerspective, cameraPerspective);
        // camera has not moved
        assert.ok(cameraPerspective.position.equals(cameraInitialPosition));

        // reset controls
        controlsPerspective.enablePan = true;
    });

    it('rotation movement', function () {
        event.button = THREE.MOUSE.LEFT;
        event.ctrlKey = true;

        // enabled rotation
        dragMouse(controlsPerspective, cameraPerspective);
        // camera has moved
        assert.ok(!cameraPerspective.position.equals(cameraInitialPosition));

        // disabled rotation
        controlsPerspective.enableRotation = false;
        dragMouse(controlsPerspective, cameraPerspective);
        // camera has not moved
        assert.ok(cameraPerspective.position.equals(cameraInitialPosition));

        // reset controls
        event.ctrlKey = false;
        controlsPerspective.enableRotation = true;
    });

    it('zoom movement for a perspective camera', function () {
        // wheel in
        wheelMouse(controlsPerspective, cameraPerspective, 10);
        // camera has moved
        assert.ok(!cameraPerspective.position.equals(cameraInitialPosition));
        controlsPerspective.state = STATE.NONE;

        // wheel out
        wheelMouse(controlsPerspective, cameraPerspective, -10);
        // camera has moved
        assert.ok(!cameraPerspective.position.equals(cameraInitialPosition));
        controlsPerspective.state = STATE.NONE;
    });

    it('zoom movement for an orthographic camera', function () {
        // wheel in
        wheelMouse(controlsOrtho, cameraOrtho, 10);
        // camera has not moved along the vertical axis
        assert.equal(cameraOrtho.position.z, cameraInitialPosition.z);
        // zoom has changed
        assert.notEqual(cameraOrtho.zoom, cameraInitialZoom);
        // reset controls
        controlsOrtho.state = STATE.NONE;

        // wheel out
        wheelMouse(controlsOrtho, cameraOrtho, -10);
        // camera has not moved along the vertical axis
        assert.equal(cameraOrtho.position.z, cameraInitialPosition.z);
        // zoom has changed
        assert.notEqual(cameraOrtho.zoom, cameraInitialZoom);
        // reset controls
        controlsOrtho.state = STATE.NONE;
    });

    it('resolution limits on zoom', function () {
        const orthoScale = viewOrtho.getPixelsToMeters();
        controlsOrtho.minResolution = orthoScale;
        controlsOrtho.maxResolution = orthoScale;

        // wheel in
        wheelMouse(controlsOrtho, cameraOrtho, 10);
        // camera has not moved
        assert.ok(cameraOrtho.position.equals(cameraInitialPosition));
        // zoom has not changed
        assert.equal(cameraOrtho.zoom, cameraInitialZoom);
        // reset controls
        controlsOrtho.minResolution = Infinity;
        controlsOrtho.maxResolution = 0;
        controlsOrtho.state = STATE.NONE;
    });

    it('smart travel for a perspective camera', function () {
        event.button = THREE.MOUSE.MIDDLE;

        // enabled smart travel
        smartTravel(controlsPerspective, cameraPerspective);
        // camera has moved
        assert.ok(!cameraPerspective.position.equals(cameraInitialPosition));
        // reset controls
        controlsPerspective.state = STATE.NONE;

        // disabled smart travel
        controlsPerspective.enableSmartTravel = false;
        smartTravel(controlsPerspective, cameraPerspective);
        // camera has not moved
        assert.ok(cameraPerspective.position.equals(cameraInitialPosition));
        // reset controls
        controlsPerspective.state = STATE.NONE;
        controlsPerspective.enableSmartTravel = true;
    });

    it('smart travel for an orthographic camera', function () {
        // enabled smart travel
        smartTravel(controlsOrtho, cameraOrtho);
        // camera has moved
        assert.ok(!cameraOrtho.position.equals(cameraInitialPosition));
        // camera has not moved along vertical axis
        assert.equal(cameraOrtho.position.z, cameraInitialPosition.z);
        // zoom has changed
        assert.notEqual(cameraOrtho.zoom, cameraInitialZoom);
        // reset controls
        controlsOrtho.state = STATE.NONE;

        // disabled smart travel
        controlsOrtho.enableSmartTravel = false;
        smartTravel(controlsOrtho, cameraOrtho);
        // camera has not moved
        assert.ok(cameraOrtho.position.equals(cameraInitialPosition));
        // zoom has not changed
        assert.equal(cameraOrtho.zoom, cameraInitialZoom);
        // reset controls
        controlsOrtho.enableSmartTravel = true;
    });

    it('travel should be instantaneous if instantTravel is true', function () {
        controlsPerspective.instantTravel = true;
        smartTravel(controlsPerspective, cameraPerspective);
        // travel has ended
        assert.equal(controlsPerspective.state, STATE.NONE);
    });

    it('should disable rotation for an orthographic camera', function () {
        assert.ok(!viewOrtho.controls.enableRotation);
    });
    it('should disable pan for an orthographic camera', function () {
        assert.ok(!viewOrtho.controls.enablePan);
    });
});
