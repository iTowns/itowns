import * as THREE from 'three';
import assert from 'assert';
import View from 'Core/View';
import ColorLayer from 'Layer/ColorLayer';
import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import FileSource from 'Source/FileSource';
import Renderer from './mock';

describe('Viewer', function () {
    let renderer;
    let viewer;
    let globelayer;
    let source;
    let colorLayer;

    before(function () {
        renderer = new Renderer();

        globelayer = new GlobeLayer('globe', new THREE.Group());
        source = new FileSource({
            parsedData: {},
            projection: 'EPSG:4326',
        });

        colorLayer = new ColorLayer('l0', { source });
    });

    beforeEach('reset viewer', function () {
        viewer = new View('EPSG:4326', renderer.domElement, {
            renderer,
        });
    });

    it('should instance viewer', () => {
        assert.ok(viewer);
    });

    it('should add globe layer', () => {
        viewer.addLayer(globelayer);
        const layers = viewer.getLayers();
        assert.equal(layers.length, 1);
    });

    it('should remove globe layer', () => {
        viewer.addLayer(globelayer);
        assert.ok(viewer.getLayerById(globelayer.id));
        viewer.removeLayer(globelayer.id);
        const layers = viewer.getLayers();
        assert.equal(layers.length, 0);
    });

    it('should add color layer', () => {
        viewer.addLayer(globelayer);
        viewer.addLayer(colorLayer, globelayer);
        const layer = viewer.getParentLayer(colorLayer);
        assert.equal(globelayer.id, layer.id);
        assert.equal(globelayer.attachedLayers.length, 1);
    });

    it('should call pick Object function', () => {
        viewer.addLayer(globelayer);
        viewer.tileLayer = globelayer;
        const picked = viewer.pickObjectsAt({ x: 10, y: 10 }, 4);
        assert.equal(picked.length, 0);
        const pickedFrom = viewer.getPickingPositionFromDepth({ x: 10, y: 10 });
        assert.ok(pickedFrom.isVector3);
    });

    it('should update sources viewer and notify change', () => {
        viewer.addLayer(globelayer);
        viewer.notifyChange(globelayer, true);
        assert.equal(viewer.mainLoop.needsRedraw, 1);
        viewer.mainLoop._step(viewer, 0);
        assert.equal(viewer.mainLoop.needsRedraw, false);
    });
});
