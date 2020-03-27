import assert from 'assert';
import Label from 'Core/Label';
import Style from 'Core/Style';
import { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import LabelLayer from 'Layer/LabelLayer';

describe('LabelLayer', function () {
    let layer;
    let collection;
    let extent;

    before('init LabelLayer and a FeatureCollection like', function () {
        layer = new LabelLayer('layer', 'EPSG:4978');
        layer.source = {};
        layer.style = new Style();
        layer.style.zoom = {
            min: 0,
            max: 10,
        };
        layer.style.text.field = 'content';

        collection = new FeatureCollection('EPSG:4326', { buildExtent: true });
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
});
