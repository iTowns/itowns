import * as THREE from 'three';
import assert from 'assert';
import View from 'Core/View';
import ColorLayer from 'Layer/ColorLayer';
import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import FileSource from 'Source/FileSource';
import Renderer from './mock';

const renderer = new Renderer();

const globelayer = new GlobeLayer('globe', new THREE.Group());
const source = new FileSource({
    url: '..',
    projection: 'EPSG:4326',
});

const colorLayer = new ColorLayer('l0', { source });

describe('Viewer', function () {
    it('Should instance viewer', () => {
        const viewer = new View('EPSG:4326', {}, {
            renderer,
        });

        assert.ok(viewer);
    });
    it('Should add globe layer', () => {
        const viewer = new View('EPSG:4326', {}, {
            renderer,
        });

        viewer.addLayer(globelayer);
        const layers = viewer.getLayers();
        assert.equal(layers.length, 1);
    });
    it('Should remove globe layer', () => {
        const viewer = new View('EPSG:4326', {}, {
            renderer,
        });

        viewer.addLayer(globelayer);
        assert.ok(viewer.getLayerById(globelayer.id));
        viewer.removeLayer(globelayer.id);
        const layers = viewer.getLayers();
        assert.equal(layers.length, 0);
    });
    it('Should add color layer', () => {
        const viewer = new View('EPSG:4326', {}, {
            renderer,
        });
        viewer.addLayer(globelayer);
        viewer.addLayer(colorLayer, globelayer);
        const layer = viewer.getParentLayer(colorLayer);
        assert.equal(globelayer.id, layer.id);
        assert.equal(globelayer.attachedLayers.length, 1);
    });
    it('Should call pick Object function', () => {
        const viewer = new View('EPSG:4326', {}, {
            renderer,
        });

        viewer.addLayer(globelayer);
        viewer.tileLayer = globelayer;
        const picked = viewer.pickObjectsAt({ x: 10, y: 10 }, 4);
        assert.equal(picked.length, 0);
        const pickedFrom = viewer.getPickingPositionFromDepth({ x: 10, y: 10 });
        assert.ok(pickedFrom.isVector3);
    });
    it('Should update sources viewer and notify change', () => {
        const viewer = new View('EPSG:4326', {}, {
            renderer,
        });
        viewer.addLayer(globelayer);
        viewer.notifyChange(globelayer, true);
        assert.equal(viewer.mainLoop.needsRedraw, 1);
        viewer.mainLoop._step(viewer, 0);
        assert.equal(viewer.mainLoop.needsRedraw, false);
    });
});
