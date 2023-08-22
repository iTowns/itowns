import assert from 'assert';
import * as THREE from 'three';
import Label from 'Core/Label';
import Style, { cacheStyle } from 'Core/Style';
import { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import LabelLayer from 'Layer/LabelLayer';
import GlobeView from 'Core/Prefab/GlobeView';
import ColorLayer from 'Layer/ColorLayer';
import FileSource from 'Source/FileSource';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Renderer from './bootstrap';

const geojson = require('../data/geojson/simple.geojson.json');

describe('LabelLayer', function () {
    let layer;
    let collection;
    let extent;

    before('init LabelLayer and a FeatureCollection like', function () {
        layer = new LabelLayer('labels', { source: false });
        layer.source = {};
        layer.style = new Style();
        layer.style.zoom = {
            min: 0,
            max: 10,
        };
        layer.style.text.field = 'content';

        collection = new FeatureCollection({ crs: 'EPSG:4326' });
        const feature = collection.requestFeatureByType(FEATURE_TYPES.POINT);
        const geometry = feature.bindNewGeometry();
        geometry.startSubGeometry(0, feature);
        geometry.pushCoordinatesValues(feature, { x: 0, y: 0 });
        geometry.closeSubGeometry(3, feature);
        geometry.properties = { content: 'foo' };

        extent = new Extent('EPSG:4326', -10, 10, -10, 10);
    });

    it('should create Labels from a FeatureCollection like object', function () {
        const labels = layer.convert(collection, extent);
        assert.ok(labels[0].isLabel);
    });
});

describe('Label', function () {
    let label;
    let style;
    const c = new Coordinates('EPSG:4326');
    const sprites = {
        img: '',
        icon: { x: 0, y: 0, width: 10, height: 10 },
    };

    before('init style', function () {
        style = new Style();
        style.setFromVectorTileLayer({
            type: 'symbol',
            paint: {},
            layout: {
                'icon-image': 'icon',
                'icon-size': 1,
            },
        }, sprites);
    });

    it('should throw errors for bad Label construction', function () {
        assert.throws(() => { label = new Label(); });
        assert.throws(() => { label = new Label('content'); });
    });

    it('should correctly create Labels', function () {
        assert.doesNotThrow(() => { label = new Label('', c); });
        assert.doesNotThrow(() => { label = new Label(document.createElement('div'), c); });
    });

    it('should set the correct icon anchor position', function () {
        label = new Label('', c, style, sprites);

        // Mock async loading image
        const img = cacheStyle.get('icon', 1);
        img.complete = true;
        img.emitEvent('load');
        assert.equal(label.content.children[0].style.left, `${-0.5 * img.width}px`);
        assert.equal(label.content.children[0].style.top, `${-0.5 * img.height}px`);


        style.icon.anchor = 'left';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, '0');
        assert.equal(label.content.children[0].style.top, `${-0.5 * img.height}px`);

        style.icon.anchor = 'right';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, `${-img.width}px`);
        assert.equal(label.content.children[0].style.top, `${-0.5 * img.height}px`);

        style.icon.anchor = 'top';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, `${-0.5 * img.width}px`);
        assert.equal(label.content.children[0].style.top, '0');

        style.icon.anchor = 'bottom';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, `${-0.5 * img.width}px`);
        assert.equal(label.content.children[0].style.top, `${-img.height}px`);

        style.icon.anchor = 'bottom-left';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, '0');
        assert.equal(label.content.children[0].style.top, `${-img.height}px`);

        style.icon.anchor = 'bottom-right';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, `${-img.width}px`);
        assert.equal(label.content.children[0].style.top, `${-img.height}px`);

        style.icon.anchor = 'top-left';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.left, '0');
        assert.equal(label.content.children[0].style.top, '0');
    });

    it('should hide the DOM', function () {
        label = new Label('', c, style);

        assert.equal(label.content.style.display, 'block');
        label.visible = false;
        assert.equal(label.content.style.display, 'none');
        label.visible = true;
        assert.equal(label.content.style.display, 'block');
    });

    it('initializes the dimensions', function () {
        style.text.anchor = 'top-left';
        label = new Label('', c, style);
        assert.equal(label.offset, undefined);

        label.initDimensions();
        assert.deepEqual(label.offset, { left: 0, right: 400, top: 0, bottom: 300 });
    });

    it('updates the projected position', function () {
        label = new Label('', c, style);
        label.offset = { left: 5, right: 35, top: 5, bottom: 15 };

        label.updateProjectedPosition(10.4, 10.6);
        assert.deepEqual(label.projectedPosition, { x: 10, y: 11 });
        assert.deepEqual(label.boundaries, { left: 13.4, right: 47.4, top: 13.6, bottom: 27.6 });
    });

    it('updates the CSS position', function () {
        label = new Label('', c, style);
        label.offset = { left: 5, right: 35, top: 5, bottom: 15 };
        assert.equal(label.content.style.transform, undefined);

        label.updateProjectedPosition(10.4, 10.6);
        label.updateCSSPosition();
        assert.equal(label.content.style.transform, 'translate(15px, 16px)');
    });

    it('updates the horizon culling point', function () {
        const parent = new THREE.Object3D();
        label = new Label('', new Coordinates('EPSG:4326', 45, 10, 0), style);
        parent.add(label);
        label.update3dPosition('EPSG:4978');
        assert.equal(label.horizonCullingPoint, undefined);

        label.horizonCullingPoint = new THREE.Vector3();
        label.updateHorizonCullingPoint();

        assert.equal(label.horizonCullingPoint.x.toPrecision(9), 4441954.88);
        assert.equal(label.horizonCullingPoint.y.toPrecision(9), 4441954.88);
        assert.equal(label.horizonCullingPoint.z.toPrecision(9), 1100248.55);
    });
});

describe('Label2DRenderer', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: 100000 };
    const view = new GlobeView(renderer.domElement, placement, { renderer });

    const gpxSource = new FileSource({
        fetchedData: geojson,
        crs: 'EPSG:4326',
        format: 'application/json',
        // TODO : is it necessary since we use fetchedData property ?
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });

    const gpxStyle = new Style({ text: { field: '{name}' } });

    const gpxLayer = new ColorLayer('Gpx', {
        source: gpxSource,
        style: gpxStyle,
        addLabelLayer: true,
    });

    const context = {
        camera: view.camera,
        engine: view.mainLoop.gfxEngine,
        scheduler: view.mainLoop.scheduler,
        view,
    };

    let tiles;
    let labelLayer;

    it('add color layer with LabelLayer', function (done) {
        view.addLayer(gpxLayer).then(() => {
            tiles = view.tileLayer.object3d.children.filter(n => n.isTileMesh);
            labelLayer = view.getLayers(l => l.isLabelLayer)[0];
            assert.ok(labelLayer.isLabelLayer);
            done();
        }, done);
    });

    const promises = [];
    it('update labelLayer add LabelNode to tile', function (done) {
        labelLayer.whenReady.then(async () => {
            tiles.forEach((tile) => {
                tile.visible = true;
                promises.push(labelLayer.update(context, labelLayer, tile, tile.parent));
            });

            await Promise.all(promises);
            const count = tiles.reduce((a, t) => a + t.link[labelLayer.id].children.length, 0);
            assert.equal(count, 1);
            done();
        }, done);
    });

    it('LabelNode has textContent', function (done) {
        labelLayer.whenReady.then(() => {
            Promise.all(promises).then(() => {
                const textContent = tiles[0].link[labelLayer.id].children[0].content.textContent;
                assert.equal(textContent, 'testPoint');
                done();
            });
        }, done);
    });

    it('LabelNode is submit to rendering', function (done) {
        labelLayer.whenReady.then(() => {
            assert.equal(0, labelLayer.object3d.children.length);
            labelLayer.update(context, labelLayer, tiles[0], tiles[0].parent);
            assert.equal(1, labelLayer.object3d.children.length);
            done();
        }, done);
    });

    it('LabelNode is disallow to rendering', function (done) {
        labelLayer.whenReady.then(() => {
            assert.equal(1, labelLayer.object3d.children.length);
            tiles[0].visible = false;
            assert.equal(0, labelLayer.object3d.children.length);
            tiles[0].visible = true;
            done();
        }, done);
    });

    const allAreVisible = dom => dom.style.display === 'block' && (dom.parentNode ? allAreVisible(dom.parentNode) : true);

    it('Dom label is visible after rendering', function (done) {
        labelLayer.whenReady.then(async () => {
            const label2dRenderer = view.mainLoop.gfxEngine.label2dRenderer;
            labelLayer.update(context, labelLayer, tiles[0], tiles[0].parent);
            assert.equal(1, labelLayer.object3d.children.length);
            view.controls.lookAtCoordinate({ coord: labelLayer.object3d.children[0].children[0].coordinates, range: 1000 }, false).then(() => {
                view.camera.camera3D.updateMatrixWorld(true);
                label2dRenderer.render(view.scene, view.camera.camera3D);
                assert.equal(1, label2dRenderer.grid.visible.length);
                const label = label2dRenderer.grid.visible[0];
                assert.ok(label.visible);
                assert.ok(allAreVisible(label.content));
                done();
            });
        }, done);
    });
});
