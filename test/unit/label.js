import assert from 'assert';
import * as THREE from 'three';
import Label from 'Core/Label';
import Style from 'Core/Style';
import { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import LabelLayer from 'Layer/LabelLayer';
import Label2DRenderer from 'Renderer/Label2DRenderer';

describe('LabelLayer', function () {
    let layer;
    let collection;
    let extent;

    before('init LabelLayer and a FeatureCollection like', function () {
        layer = new LabelLayer('labels');
        layer.source = {};
        layer.style = new Style();
        layer.style.zoom = {
            min: 0,
            max: 10,
        };
        layer.style.text.field = 'content';

        collection = new FeatureCollection('EPSG:4326', { crs: 'EPSG:4326', buildExtent: true });
        const feature = collection.requestFeatureByType(FEATURE_TYPES.POINT);
        const geometry = feature.bindNewGeometry();
        geometry.startSubGeometry(0, feature);
        geometry.pushCoordinatesValues(feature, 0, 0);
        geometry.closeSubGeometry(3, feature);
        geometry.properties = { content: 'foo' };

        extent = new Extent('EPSG:4978', -10, 10, -10, 10);
    });

    it('should create Labels from a FeatureCollection like object', function () {
        const labels = layer.convert(collection, extent);
        assert.ok(labels[0].isLabel);
    });
});

describe('Label', function () {
    let label;
    let style;
    const c = new Coordinates('EPSG:4978');

    before('init style', function () {
        style = new Style();
        style.setFromVectorTileLayer({
            type: 'symbol',
            paint: {},
            layout: {
                'icon-image': 'icon',
            },
        }, {
            img: '',
            icon: { x: 0, y: 0, width: 10, height: 10 },
        });
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
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.right, 'calc(50% - 5px)');
        assert.equal(label.content.children[0].style.top, 'calc(50% - 5px)');

        style.text.anchor = 'left';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.right, 'calc(100% - 5px)');
        assert.equal(label.content.children[0].style.top, 'calc(50% - 5px)');

        style.text.anchor = 'right';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.top, 'calc(50% - 5px)');

        style.text.anchor = 'top';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.right, 'calc(50% - 5px)');

        style.text.anchor = 'bottom';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.top, 'calc(100% - 5px)');
        assert.equal(label.content.children[0].style.right, 'calc(50% - 5px)');

        style.text.anchor = 'bottom-left';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.right, 'calc(100% - 5px)');
        assert.equal(label.content.children[0].style.top, 'calc(100% - 5px)');

        style.text.anchor = 'bottom-right';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.top, 'calc(100% - 5px)');

        style.text.anchor = 'top-left';
        label = new Label('', c, style);
        assert.equal(label.content.children[0].style.right, 'calc(100% - 5px)');
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
        assert.equal(label.content.style.transform, 'translate(13.4px, 13.6px)');
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
    let node;

    function checkVisible(node) {
        assert.ok(node.domElements.foo.visible);
        assert.equal(node.domElements.foo.dom.style.display, 'block');
    }

    function checkHidden(node) {
        assert.ok(!node.domElements.foo.visible);
        assert.equal(node.domElements.foo.dom.style.display, 'none');
    }

    before('initialize the node and its children', function () {
        node = {
            domElements: { foo: { visible: true, dom: { style: { display: 'block' } } } },
            children: [{
                domElements: { foo: { visible: true, dom: { style: { display: 'block' } } } },
                isTileMesh: true,
            }, {
                domElements: { foo: { visible: true, dom: { style: { display: 'block' } } } },
                isTileMesh: true,
                children: [{
                    domElements: { foo: { visible: true, dom: { style: { display: 'block' } } } },
                    isTileMesh: true,
                }],
            }],
        };
    });

    it('hides the DOM of a node', function () {
        checkVisible(node);
        Label2DRenderer.prototype.hideNodeDOM(node);
        checkHidden(node);
    });

    it('shows the DOM of a node', function () {
        checkHidden(node);
        Label2DRenderer.prototype.showNodeDOM(node);
        checkVisible(node);
    });

    it('hides the DOM of a node\'s children', function () {
        delete node.domElements.foo;
        checkVisible(node.children[0]);
        checkVisible(node.children[1]);
        Label2DRenderer.prototype.hideNodeDOM(node);
        checkHidden(node.children[0]);
        checkHidden(node.children[1]);

        Label2DRenderer.prototype.showNodeDOM(node.children[0]);
        Label2DRenderer.prototype.showNodeDOM(node.children[1]);

        delete node.children[1].domElements.foo;
        checkVisible(node.children[0]);
        checkVisible(node.children[1].children[0]);
        Label2DRenderer.prototype.hideNodeDOM(node);
        checkHidden(node.children[0]);
        checkHidden(node.children[1].children[0]);
    });
});
