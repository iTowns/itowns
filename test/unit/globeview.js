import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';

import Renderer from './mock';

const renderer = new Renderer();

const positionOnGlobe = { longitude: 4.631512, latitude: 43.675626, altitude: 250000 };
const viewer = new GlobeView(renderer.domElement, positionOnGlobe, { renderer });

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
});

