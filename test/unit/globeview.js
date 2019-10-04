import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';

import Renderer from './mock';

const renderer = new Renderer();

// 3919 is the approximate altitude giving a 1/25000 scale, on a screen with a
// pitch of 0.28. The approximation is corrected below with an epsilon.
const positionOnGlobe = { longitude: 4.631512, latitude: 43.675626, altitude: 3919 };
const viewer = new GlobeView(renderer.domElement, positionOnGlobe, { renderer });
const pickedPosition = new THREE.Vector3();
pickedPosition.copy(viewer.camera.position());

const cameraDirection = new THREE.Vector3();
viewer.camera.camera3D.getWorldDirection(cameraDirection);
cameraDirection.multiplyScalar(positionOnGlobe.altitude);
pickedPosition.add(cameraDirection);

viewer.getPickingPositionFromDepth = function getPickingPositionFromDepth(screenCoord, targetPoint = new THREE.Vector3()) {
    return targetPoint.copy(pickedPosition);
};

const context = {
    camera: viewer.camera,
    engine: viewer.mainLoop.gfxEngine,
    scheduler: viewer.mainLoop.scheduler,
    geometryLayer: viewer.tileLayer,
    elevationLayers: [],
    colorLayers: [],
    view: viewer,
};

describe('GlobeView', function () {
    it('instance', function () {
        assert.ok(viewer);
    });

    it('update', function () {
        viewer.tileLayer.whenReady.then(() => {
            const node = viewer.tileLayer.level0Nodes[0];
            viewer.tileLayer.update(context, viewer.tileLayer, node);
        });
    });

    it('ObjectRemovalHelper', function () {
        viewer.tileLayer.whenReady.then(() => {
            const node = viewer.tileLayer.level0Nodes[0];
            ObjectRemovalHelper.removeChildrenAndCleanup(viewer.tileLayer, node);
            ObjectRemovalHelper.removeChildren(viewer.tileLayer, node);
        });
    });

    describe('Measuring', function () {
        it('should get the zoom scale', () => {
            const computed = viewer.getScale();
            const scale = 1 / 25000;
            assert.ok(computed < scale + 10e-7);
            assert.ok(computed > scale - 10e-7);
        });

        it('should get the distance from the camera', () => {
            const realDistance = viewer.getDistanceFromCamera();
            assert.ok(realDistance < positionOnGlobe.altitude + 10);
            assert.ok(realDistance > positionOnGlobe.altitude - 10);
        });

        it('should convert a pixel distance to meters', () => {
            // (1 / 0.28) pixel is equal to 1 cm on screen, so 25m on ground
            const computed = viewer.getPixelsToMeters(1 / 0.28);
            const meters = 25;
            assert.ok(computed < meters + 10e-3);
            assert.ok(computed > meters - 10e-3);
        });

        it('should convert a meter distance to pixels', () => {
            // 25m on ground should give 1 cm on screen, so (1 / 0.28) pixels
            const computed = 1 / viewer.getMetersToPixels(25);
            const pixels = 0.28;
            assert.ok(computed < pixels + 10e-4);
            assert.ok(computed > pixels - 10e-4);
        });
    });
});

