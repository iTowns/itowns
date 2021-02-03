import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import Renderer from './bootstrap';
import CameraUtils from '../../src/Utils/CameraUtils';
import OBB from '../../src/Renderer/OBB';

function compareWithEpsilon(a, b, epsilon) {
    return a - epsilon < b && a + epsilon > b;
}

describe('GlobeView', function () {
    const renderer = new Renderer();

    // 3919 is the approximate altitude giving a 1/25000 scale, on a screen with a
    // pitch of 0.28. The approximation is corrected below with an epsilon.
    const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: 3919 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });
    const pickedPosition = new THREE.Vector3();
    pickedPosition.copy(viewer.camera.position());

    const cameraDirection = new THREE.Vector3();
    viewer.camera.camera3D.getWorldDirection(cameraDirection);
    cameraDirection.multiplyScalar(placement.range);
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

    it('instance', function () {
        assert.ok(viewer);
    });

    it('update', function (done) {
        viewer.tileLayer.whenReady.then(() => {
            const node = viewer.tileLayer.level0Nodes[0];
            viewer.tileLayer.update(context, viewer.tileLayer, node);
            done();
        });
    });

    it('ObjectRemovalHelper', function (done) {
        viewer.tileLayer.whenReady.then(() => {
            const node = viewer.tileLayer.level0Nodes[0];
            ObjectRemovalHelper.removeChildrenAndCleanup(viewer.tileLayer, node);
            ObjectRemovalHelper.removeChildren(viewer.tileLayer, node);
            done();
        });
    });

    it('should get the zoom scale', () => {
        const computed = viewer.getScale();
        const scale = 1 / 25000;
        assert.ok(compareWithEpsilon(computed, scale, 10e-7));
        assert.ok(compareWithEpsilon(computed, scale, 10e-7));
    });

    it('should get the distance from the camera', () => {
        const realDistance = viewer.getDistanceFromCamera();
        assert.ok(compareWithEpsilon(realDistance, placement.range, 10));
        assert.ok(compareWithEpsilon(realDistance, placement.range, 10));
    });

    it('should convert a pixel distance to meters', () => {
        // (1 / 0.28) pixel is equal to 1 cm on screen, so 25m on ground
        const computed = viewer.getPixelsToMeters(1 / 0.28);
        const meters = 25;
        assert.ok(compareWithEpsilon(computed, meters, 10e-3));
        assert.ok(compareWithEpsilon(computed, meters, 10e-3));
    });

    it('should convert a meter distance to pixels', () => {
        // 25m on ground should give 1 cm on screen, so (1 / 0.28) pixels
        const computed = 1 / viewer.getMetersToPixels(25);
        const pixels = 0.28;
        assert.ok(compareWithEpsilon(computed, pixels, 10e-4));
        assert.ok(compareWithEpsilon(computed, pixels, 10e-4));
    });

    it('should place camera at given extent', () => {
        const extent = new Extent('EPSG:4326', 4.6315, 5.6315, 43.6756, 44.6756);
        const extentViewer = new GlobeView(
            renderer.domElement,
            extent,
            { renderer },
        );
        const camera3D = extentViewer.camera.camera3D;
        const size = new THREE.Vector3();
        new OBB().setFromExtent(extent).box3D.getSize(size);
        assert.ok(
            CameraUtils.getTransformCameraLookingAtTarget(extentViewer, camera3D).range -
            size.x / (2 * Math.tan(THREE.Math.degToRad(camera3D.fov) / 2))
            < Math.pow(10, -6),
        );
    });
});

