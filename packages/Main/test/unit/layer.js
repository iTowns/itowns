import assert from 'assert';
import Layer from 'Layer/Layer';
import * as ImageryLayers from 'Layer/ImageryLayers';
import ColorLayer from 'Layer/ColorLayer';

describe('Layer', function () {
    it('should emit an event on property changed', function () {
        const layer = new Layer('testId', { source: false });
        layer.defineLayerProperty('test', 0);
        layer.addEventListener('test-property-changed', (e) => {
            assert.equal(e.type, 'test-property-changed');
            assert.equal(e.previous.test, 0);
            assert.equal(e.new.test, 1);
        });
        layer.test = 1;
    });
});

describe('ImageryLayers', function () {
    const layers = [
        new ColorLayer('l0', { source: false }),
        new ColorLayer('l1', { source: false }),
        new ColorLayer('l2', { source: false }),
        new ColorLayer('l3', { source: false }),
    ];

    layers[0].sequence = 0;
    layers[1].sequence = 1;
    layers[2].sequence = 2;
    layers[3].sequence = 3;

    it('should return all layers id in order', function () {
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l0');
        assert.equal(res[1], 'l1');
        assert.equal(res[2], 'l2');
        assert.equal(res[3], 'l3');
    });

    it('should move the layer l3 to the first index', function () {
        ImageryLayers.moveLayerToIndex(layers[3], 0, layers);
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l3');
        assert.equal(res[1], 'l0');
        assert.equal(res[2], 'l1');
        assert.equal(res[3], 'l2');
    });

    it('should move the layer l1 to the second index', function () {
        ImageryLayers.moveLayerDown(layers[1], layers);
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l3');
        assert.equal(res[1], 'l1');
        assert.equal(res[2], 'l0');
        assert.equal(res[3], 'l2');
    });

    it('should move the layer l0 to the last index', function () {
        ImageryLayers.moveLayerUp(layers[0], layers);
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l3');
        assert.equal(res[1], 'l1');
        assert.equal(res[2], 'l2');
        assert.equal(res[3], 'l0');
    });

    it('throws error when instance layer without Source', function () {
        assert.throws(() => new ColorLayer('id'), /^Error: Layer id needs Source$/);
    });
});
