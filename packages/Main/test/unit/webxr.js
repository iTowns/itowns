import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates } from '@itowns/geographic';
import * as THREE from 'three';
import Renderer from './bootstrap';


/*
 Can't test with controllers because mocha doesn't support the necessary functions
 */
describe('WebXR', function () {
    let viewer;
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
    });

    it('should store webXr', function () {
        assert.ok(viewer.webXR);
    });

    it('should initialize webXr', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        const sessionEvent = webXRManager.events.get('sessionstart');
        assert.ok(typeof sessionEvent === 'function');
    });
    it('should initialize webXr session', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        assert.ok(webXRManager.enabled === undefined);
        assert.ok(viewer._camXR === undefined);
        webXRManager.dispatchEvent({ type: 'sessionstart' });
        assert.ok(webXRManager.enabled);
        assert.ok(viewer._camXR);
    });
    it('should initialize webXr controllers handler', function () {
        const vrControls = viewer.webXR.vrControls;

        assert.ok(vrControls);
        assert.ok(vrControls.controllers);
    });

    it('should register controllers on "connected" events', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;

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
});
