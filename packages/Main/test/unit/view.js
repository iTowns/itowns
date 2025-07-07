import * as THREE from 'three';
import { getMaxColorSamplerUnitsCount } from 'Renderer/LayeredMaterial';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import assert from 'assert';
import View from 'Core/View';
import ColorLayer from 'Layer/ColorLayer';
import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import FileSource from 'Source/FileSource';
import ColorLayersOrdering from 'Renderer/ColorLayersOrdering';
import { CAMERA_TYPE } from 'Renderer/Camera';
import Capabilities from 'Core/System/Capabilities';
import Renderer from './bootstrap';

describe('Viewer', function () {
    let renderer;
    let viewer;
    let globelayer;
    let source;
    let colorLayer;
    let colorLayer2;

    before(function () {
        renderer = new Renderer();

        globelayer = new GlobeLayer('globe', new THREE.Group());
        source = new FileSource({
            features: { crs: 'EPSG:4326' },
            crs: 'EPSG:4326',
        });

        colorLayer = new ColorLayer('l0', { source, addLabelLayer: true, crs: 'EPSG:4326' });
        colorLayer2 = new ColorLayer('l1', { source });
    });

    beforeEach('reset viewer', function () {
        // globelayer.level0Nodes = [new THREE.Object3D()];
        globelayer.attachedLayers = [];
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
        const layer = colorLayer.parent;
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
        global.requestAnimationFrame = step => step(0);
        let wasRedraw = false;

        viewer.addFrameRequester(
            MAIN_LOOP_EVENTS.BEFORE_RENDER,
            () => {
                wasRedraw = true;
            },
        );
        viewer.addLayer(globelayer);
        viewer.notifyChange(globelayer, true);
        assert.equal(wasRedraw, true);

        wasRedraw = false;
        viewer.notifyChange(globelayer, false);
        assert.equal(wasRedraw, false);

        global.requestAnimationFrame = () => {};
    });

    it('ColorLayersOrdering', (done) => {
        viewer.addLayer(globelayer).then(() => {
            viewer.tileLayer = globelayer;
            viewer.addLayer(colorLayer, globelayer).then(() => {
                viewer.addLayer(colorLayer2, globelayer).then(() => {
                    ColorLayersOrdering.moveLayerUp(viewer, colorLayer.id);
                    assert.equal(colorLayer.sequence, 1);
                    ColorLayersOrdering.moveLayerDown(viewer, colorLayer.id);
                    assert.equal(colorLayer.sequence, 0);
                    ColorLayersOrdering.moveLayerToIndex(viewer, colorLayer.id, 1);
                    assert.equal(colorLayer.sequence, 1);
                    done();
                });
            });
        });
    });

    it('resize', () => {
        const width = 100;
        const height = 200;
        viewer.resize(width, height);
        assert.equal(width, viewer.mainLoop.gfxEngine.width);
        assert.equal(height, viewer.mainLoop.gfxEngine.height);
        assert.equal(width, viewer.camera.width);
        assert.equal(height, viewer.camera.height);
    });

    it('read pixel with readDepthBuffer returns a pixel buffer', () => {
        viewer.tileLayer = { level0Nodes: [] };
        const bufferPixel = viewer.readDepthBuffer(0, 0, 1, 1);

        assert.equal(bufferPixel.length, 4);
    });

    it('Capabilities', () => {
        const getParameterOrig = renderer.context.getParameter;
        const getProgramParameterOrig = renderer.context.getProgramParameter;

        // pretend that MAX_TEXTURE_IMAGE_UNITS is 42
        renderer.context.getParameter = () => 42;

        // Simulate a success of linkProgram by making getProgramParameter return true.
        // In that case, the maximum color sampler count is computed.
        renderer.context.getProgramParameter = () => true;
        Capabilities.updateCapabilities(renderer);
        assert.equal(getMaxColorSamplerUnitsCount(), 41);

        // Simulate a failure of linkProgram by making getProgramParameter return false.
        // In that case, throw an error.
        renderer.context.getProgramParameter = () => false;
        assert.throws(() => { Capabilities.updateCapabilities(renderer); });

        // retrieve original function values
        renderer.context.getParameter = getParameterOrig;
        renderer.context.getProgramParameter = getProgramParameterOrig;
    });

    it('Dispose view', () => {
        viewer.addLayer(globelayer);
        assert.equal(viewer.getLayers().length, 1);
        viewer.dispose();
        assert.equal(Object.values(viewer._frameRequesters).length, 0);
        assert.equal(viewer.getLayers().length, 0);
        assert.equal(viewer._listeners, undefined);
    });
    it('Should create the correct camera from type', () => {
        const view = new View('EPSG:4326', renderer.domElement, {
            renderer,
            camera: { type: CAMERA_TYPE.ORTHOGRAPHIC },
        });
        assert.ok(view.camera3D.isOrthographicCamera);
    });
    it('should create the correct camera from specific camera', () => {
        const camera = new THREE.PerspectiveCamera(50, 0.5);
        const view = new View('', renderer.domElement, {
            renderer,
            camera: { cameraThree: camera },
        });
        assert.equal(view.camera3D, camera);
    });
});
