import assert from 'assert';
import LayerUpdateState from '../../src/Core/Layer/LayerUpdateState';
import TextureProcessing from '../../src/Process/LayeredMaterialNodeProcessing';

describe('material state vs layer state', function () {
    let opacity;
    let visible;

    const node = {
        parent: { },
        layerUpdateState: {
            test: new LayerUpdateState(),
        },
        material: {
            visible: true,
            indexOfColorLayer: () => 0,
            setLayerVisibility: (idx, v) => { visible = v; },
            setLayerOpacity: (idx, o) => { opacity = o; },
        },
    };
    const layer = {
        id: 'test',
        visible: true,
        opacity: 1.0,
    };

    it('should correctly initialize opacity & visibility', () => {
        node.layerUpdateState.test.failure(new Date());
        TextureProcessing.Color.updateLayerElement(null, layer, node);
        assert.equal(opacity, layer.opacity);
        assert.equal(visible, layer.visible);
    });
    it('should update material opacity & visibility', () => {
        layer.opacity = 0.5;
        layer.visible = false;
        TextureProcessing.Color.updateLayerElement(null, layer, node);
        assert.equal(opacity, layer.opacity);
        assert.equal(visible, layer.visible);
    });
    it('should update material opacity & visibility even if layer is cannot be updated', () => {
        node.layerUpdateState.test.noMoreUpdatePossible();
        layer.opacity = 0.75;
        TextureProcessing.Color.updateLayerElement(null, layer, node);
        assert.equal(opacity, layer.opacity);
        assert.equal(visible, layer.visible);
    });
});
