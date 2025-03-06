import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import WebXR from 'Renderer/WebXR';
import DEMUtils from 'Utils/DEMUtils';
import VRControls from 'Controls/VRControls';

import { Coordinates } from '@itowns/geographic';
import * as THREE from 'three';
import Renderer from './bootstrap';



describe('WebXR', function () {
    let viewer;
    const original = DEMUtils.getElevationValueAt;
    const ELEVATION = 10;

    before(async function () {
        const renderer = new Renderer();
        const p = {
            coord: new Coordinates('EPSG:4326', -75.61349, 40.044259),
            range: 200,
            tilt: 10,
            heading: -145,
        };

        viewer = new GlobeView(renderer.domElement, p,  {
            renderer,
            webXR: { controllers: true },
        });

        DEMUtils.getElevationValueAt = () => ELEVATION;
    });


    after(() => {
        DEMUtils.getElevationValueAt = original;
    });

    it('should store webXr', function () {
        // Verify that the viewer instance has a webXR property set up.
        assert.ok(viewer.webXR);
    });

    it('should initialize webXr', function () {
        // Access the WebXR manager from the viewer's renderer.
        const webXRManager = viewer.renderer.xr;
        // Retrieve the 'sessionstart' event listener from the manager.
        const sessionEvent = webXRManager.events.get('sessionstart');
        // Check that the 'sessionstart' event is a function, indicating proper initialization.
        assert.ok(typeof sessionEvent === 'function');
    });

    it('should initialize webXr session', function () {
        // Access the WebXR manager from the viewer's renderer.
        const webXRManager = viewer.renderer.xr;
        // Before the session starts, ensure that the XR session is not enabled and no camera has been set.
        assert.ok(webXRManager.enabled === undefined);
        assert.ok(viewer._camXR === undefined);
        // Simulate a session start event.
        webXRManager.dispatchEvent({ type: 'sessionstart' });
        // Verify that after the event, the WebXR manager is enabled and the camera (_camXR) is initialized.
        assert.ok(webXRManager.enabled);
        assert.ok(viewer._camXR);
    });

    it('should initialize a webXR session without controllers with no option', function (done) {
        // Create a fake THREE.js scene.
        const fakeScene = new THREE.Scene();
        // Create a fake PerspectiveCamera for the 3D camera.
        const fakeCamera3D = new THREE.PerspectiveCamera();
        fakeCamera3D.updateProjectionMatrix();
        // Define a fake main loop with a step function that sets a flag when called.
        const fakeMainLoop = {
            step(view, timestamp) {
                this.called = true;
            },
        };
        let notifyCalled = false;
        // Create a fake view object containing necessary properties for WebXR initialization.
        const fakeView = {
            renderer: new Renderer(),
            scene: fakeScene,
            camera3D: fakeCamera3D,
            mainLoop: fakeMainLoop,
            // notifyChange will flag that it was invoked.
            notifyChange(camera, flag) {
                notifyCalled = true;
            },
        };

        // Retrieve the fake XR manager from the fake view's renderer.
        const fakeXR = fakeView.renderer.xr;
        // Simulate an active XR session.
        fakeXR.isPresenting = true;
        // Define options with controllers disabled.
        const options = {
            controllers: false,
            callback() {},
        };

        // Create a new WebXR instance with the fake view and options.
        const webxrInstance = new WebXR(fakeView, options);
        // Attach the webxrInstance to fakeView for later reference.
        fakeView.webXR = webxrInstance;
        // Initialize the WebXR session.
        webxrInstance.initializeWebXR();
        // Dispatch the 'sessionstart' event to simulate starting the session.
        fakeXR.dispatchEvent({ type: 'sessionstart' });

        // Since controllers are disabled, verify that vrControls remains null.
        assert.strictEqual(fakeView.webXR.vrControls, null, 'vrControls should be null when controllers option is false');

        // Simulate the animation loop callback with a dummy timestamp.
        fakeXR.animationLoopCallback(54321);

        // Check that camera3D's position was updated from the fake XR camera (expected to be (80, 90, 100)).
        assert.ok(fakeView.camera3D.position.equals(new THREE.Vector3(80, 90, 100)), 'camera3D position updated from xr camera');
        // Check that camera3D's quaternion was updated from the fake XR camera (expected to be (0, 0, 0, 1)).
        assert.ok(fakeView.camera3D.quaternion.equals(new THREE.Quaternion(0, 0, 0, 1)), 'camera3D quaternion updated from xr camera');
        // Verify that the view was notified of the change.
        assert.ok(notifyCalled, 'notifyChange should have been called');
        // Verify that the main loop's step function was executed.
        assert.ok(fakeMainLoop.called, 'mainLoop.step should have been called');
        done();
    });

    describe('vrControls', function () {
        it('should initialize webXr controllers handler', function () {
            const vrControls = viewer.webXR.vrControls;
            assert.ok(vrControls);
            assert.ok(vrControls.controllers);
        });

        it('should register controllers on "connected" events', function () {
            const webXRManager = viewer.renderer.xr;

            const vrControls = viewer.webXR.vrControls;
            // Reset controllers to ensure a clean state.
            vrControls.controllers = [];

            // Simulate a "connected" event for the first controller.
            const controller0 = webXRManager.getController(0);
            controller0.dispatchEvent({
                type: 'connected',
                data: { handedness: 'right', gamepad: { axes: [0, 0, 0, 0], buttons: [] } },
            });
            assert.strictEqual(vrControls.controllers.length, 1);
            assert.strictEqual(vrControls.controllers[0].name, 'right');

            // Simulate a "connected" event for the second controller.
            const controller1 = webXRManager.getController(1);
            controller1.dispatchEvent({
                type: 'connected',
                data: { handedness: 'left', gamepad: { axes: [0, 0, 0, 0], buttons: [] } },
            });
            assert.strictEqual(vrControls.controllers.length, 2);
            assert.strictEqual(vrControls.controllers[1].name, 'left');
        });

        it('should bind grip controllers to the XR group', function () {
            const vrControls = viewer.webXR.vrControls;

            // Verify that the XR group contains a grip controller.
            const groupChildren = vrControls.groupXR.children;
            const gripFound = groupChildren.some(child =>
                child.name && child.name.indexOf('GripController') !== -1);
            assert.ok(gripFound, 'Grip controller should be present in groupXR');
        });

        it('should compute a valid yaw rotation quaternion', function () {
            const vrControls = viewer.webXR.vrControls;

            const currentVal = vrControls.groupXR.quaternion.clone().normalize();

            const yawQuat = vrControls.getRotationYaw(0);
            assert.ok(yawQuat instanceof THREE.Quaternion, 'getRotationYaw should return a THREE.Quaternion');

            assert.ok(yawQuat.equals(currentVal), 'getRotationYaw(0) should return the current rotation');
        });
        it('should compute yaw rotation with non-zero axis', function () {
            const vrControls = viewer.webXR.vrControls;
            const originalQuaternion = vrControls.groupXR.quaternion.clone();
            const yawQuat = vrControls.getRotationYaw(50);
            assert.notStrictEqual(yawQuat, originalQuaternion, 'Yaw should change with axis input');
        });

        it('should compute a valid pitch rotation quaternion', function () {
            const vrControls = viewer.webXR.vrControls;

            const pitchQuat = vrControls.getRotationPitch(10);
            assert.ok(pitchQuat instanceof THREE.Quaternion, 'getRotationPitch should return a THREE.Quaternion');
        });

        it('should compute a valid translation elevation vector', function () {
            const vrControls = viewer.webXR.vrControls;
            // const currentVal = viewer.camera3D.position.clone().normalize();

            const speedFactor = vrControls.getSpeedFactor();
            const transVec = vrControls.getTranslationElevation(0, speedFactor);
            assert.ok(transVec instanceof THREE.Vector3, 'getTranslationElevation should return a THREE.Vector3');
            const vec0 = new THREE.Vector3();
            assert.ok(vec0.equals(transVec), 'getTranslationElevation(0) should return no elevation');
        });

        it('should apply transformation to XR group', function () {
            const vrControls = viewer.webXR.vrControls;

            // Create a translation vector and an offset rotation.
            const trans = new THREE.Vector3(5, 10, 15);
            const offsetRotation = new THREE.Quaternion();
            // Set the rotation using Euler angles for demonstration.
            offsetRotation.setFromEuler(new THREE.Euler(Math.PI / 4, Math.PI / 2, Math.PI / 6));

            // Apply the transformation.
            vrControls.applyTransformationToXR(trans, offsetRotation);

            // Check that groupXR's position and quaternion match the given values.
            assert.ok(vrControls.groupXR.position.equals(trans), 'groupXR position should match the provided translation vector');
            assert.ok(vrControls.groupXR.quaternion.equals(offsetRotation), 'groupXR quaternion should match the provided offset rotation');
        });


        it('should handle active axes and button press', function () {
            const vrControls = viewer.webXR.vrControls;
            const webXRManager = viewer.renderer.xr;
            const controller = webXRManager.getController(0);

            // Simulate active axes: nonzero value in axes array.
            controller.gamepad = {
                axes: [0, 0, 0.5, 0],
                buttons: [
                    { pressed: true, touched: false },  // simulate a pressed button at index 0
                ],
            };


            controller.events = [];

            controller.dispatchEvent = function (event) {
                this.events.push(event);
            };

            // vrControls.controllers = [fakeController];
            vrControls.listenGamepad();

            // Expect an axes-changed event because axes are active.
            const axesChangedEvent = controller.events.find(e => e.type === 'itowns-xr-axes-changed');
            assert.ok(axesChangedEvent, 'Expected itowns-xr-axes-changed event');

            // Since it was not active before, isStickActive should now be true and endGamePadtrackEmit set to false.
            assert.strictEqual(controller.isStickActive, true, 'Controller should be marked as stick active');
            assert.strictEqual(controller.gamepad.endGamePadtrackEmit, false, 'endGamePadtrackEmit should be false');

            // Expect a button-pressed event for the pressed button.
            const buttonPressedEvent = controller.events.find(e => e.type === 'itowns-xr-button-pressed');
            assert.ok(buttonPressedEvent, 'Expected itowns-xr-button-pressed event');
            assert.strictEqual(controller.lastButtonItem, controller.gamepad.buttons[0], 'lastButtonItem should be set to the pressed button');
        });

        it('should dispatch itowns-xr-axes-stop when stick becomes inactive', function () {
            const vrControls = viewer.webXR.vrControls;
            const webXRManager = viewer.renderer.xr;
            const controller = webXRManager.getController(0);
            // Simulate inactive axes.
            controller.gamepad = {
                axes: [0, 0, 0, 0],
                buttons: [], // no buttons pressed
            };
            // Controller was previously active.
            controller.isStickActive = true;
            controller.gamepad.endGamePadtrackEmit = true;
            controller.events = [];
            controller.dispatchEvent = function (event) {
                this.events.push(event);
            };

            vrControls.listenGamepad();

            const axesStopEvent = controller.events.find(e => e.type === 'itowns-xr-axes-stop');
            assert.ok(axesStopEvent, 'Expected itowns-xr-axes-stop event');
            assert.strictEqual(controller.isStickActive, false, 'Controller should be marked as not stick active');
        });

        it('should dispatch itowns-xr-button-released when button is released', function () {
            const vrControls = viewer.webXR.vrControls;
            const webXRManager = viewer.renderer.xr;
            const controller = webXRManager.getController(0);
            // Simulate inactive axes.        // Simulate no active axes.
            controller.gamepad = {
                axes: [0, 0, 0, 0],
                buttons: [
                    { pressed: false, touched: false },  // button is not pressed now
                ],
            };
            // Simulate that a button was previously pressed.
            controller.lastButtonItem = controller.gamepad.buttons[0];
            controller.isStickActive = false;
            controller.events = [];
            controller.dispatchEvent = function (event) {
                this.events.push(event);
            };

            vrControls.listenGamepad();

            const buttonReleasedEvent = controller.events.find(e => e.type === 'itowns-xr-button-released');
            assert.ok(buttonReleasedEvent, 'Expected itowns-xr-button-released event');
            assert.strictEqual(controller.lastButtonItem, undefined, 'lastButtonItem should be reset to undefined');
        });

        it('should return original translation when getCameraCoordinate is unavailable', function () {
            const vrControls = viewer.webXR.vrControls;
            // Mock the absence of getCameraCoordinate
            const originalGetCameraCoordinate = vrControls.view.controls.getCameraCoordinate;
            vrControls.view.controls.getCameraCoordinate = undefined;

            const trans = new THREE.Vector3(100, 200, 300);
            const result = vrControls.clampToGround(trans);
            assert.ok(result.equals(trans), 'Should return original translation');

            // Restore original method
            vrControls.view.controls.getCameraCoordinate = originalGetCameraCoordinate;
        });

        it('should trigger correct selectEnd handlers based on handedness', function () {
            const vrControls = viewer.webXR.vrControls;
            const ctrlLeft = { userData: { handedness: 'left' } };
            const ctrlRight = { userData: { handedness: 'right' } };

            // Spy on end handlers
            let leftEndCalled = false;
            let rightEndCalled = false;
            vrControls.onSelectLeftEnd = () => { leftEndCalled = true; };
            vrControls.onSelectRightEnd = () => { rightEndCalled = true; };

            vrControls.onSelectEnd({ target: ctrlLeft });
            assert.ok(rightEndCalled, 'Left end should call onSelectRightEnd');

            vrControls.onSelectEnd({ target: ctrlRight });
            assert.ok(leftEndCalled, 'Right end should call onSelectLeftEnd');
        });

        it('should handle left axis changes with different dominant axes', function () {
            const vrControls = viewer.webXR.vrControls;
            const ctrl = {
                userData: { handedness: 'left' },
                gamepad: { axes: [0, 0, 0.8, 0.2] }, // Axis 2 dominant
            };

            let beforeQuat = vrControls.groupXR.quaternion.clone();
            vrControls.onLeftAxisChanged(ctrl);
            assert.ok(!vrControls.groupXR.quaternion.equals(beforeQuat), 'Yaw rotation applied');

            beforeQuat = vrControls.groupXR.quaternion.clone();
            // Test axis 3 dominant
            ctrl.gamepad.axes = [0, 0, 0.2, 0.8];
            vrControls.onLeftAxisChanged(ctrl);
            assert.ok(!vrControls.groupXR.quaternion.equals(beforeQuat), 'Pitch rotation applied');
        });

        it('should combine X and Z axes for camera movement', function () {
            const vrControls = viewer.webXR.vrControls;
            const ctrl = {
                gamepad: { axes: [0, 0, 0.5, 0.5] }, // Both axes active
                userData: { handedness: 'right' },
            };

            const originalPosition = vrControls.groupXR.position.clone();
            vrControls.cameraOnFly(ctrl);

            assert.ok(!vrControls.groupXR.position.equals(originalPosition), 'Position should change');
        });

        it('should clamp position to ground level', function () {
            const vrControls = viewer.webXR.vrControls;
            // Mock elevation below MIN_DELTA
            const lowPosition = new THREE.Vector3(0, 0, 0);

            vrControls.clampAndApplyTransformationToXR(lowPosition, new THREE.Quaternion());
            const coordinate = new Coordinates(
                viewer.referenceCrs,
                vrControls.groupXR.position.x,
                vrControls.groupXR.position.y,
                vrControls.groupXR.position.z,
            );
            const convertedPos = coordinate.as(viewer.controls.getCameraCoordinate().crs).toVector3();
            const clampedY = convertedPos.z;
            // 0.5 is an epsilon for conversion error
            assert.ok(clampedY >= ELEVATION + VRControls.MIN_DELTA_ALTITUDE - 0.5, 'Y position clamped');
        });

        it('should clamp speed factor between 2 and 2000', function () {
            const vrControls = viewer.webXR.vrControls;
            // Mock altitude values
            vrControls.view.controls.getCameraCoordinate = () => ({ altitude: 10 });
            assert.strictEqual(vrControls.getSpeedFactor(), 2, 'Minimum speed');

            vrControls.view.controls.getCameraCoordinate = () => ({ altitude: 100000 });
            assert.strictEqual(vrControls.getSpeedFactor(), 2000, 'Maximum speed');
        });

        it('should handle left button release without errors', function () {
            const vrControls = viewer.webXR.vrControls;
            // Ensure no exceptions are thrown
            assert.doesNotThrow(() => vrControls.onLeftButtonReleased());
        });
    });
});
