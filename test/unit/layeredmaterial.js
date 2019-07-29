import assert from 'assert';
import LayerUpdateState from 'Layer/LayerUpdateState';
import { updateLayeredMaterialNodeImagery } from 'Process/LayeredMaterialNodeProcessing';

describe('material state vs layer state', function () {
    const nodeLayer = { };
    const node = {
        parent: { },
        layerUpdateState: {
            test: new LayerUpdateState(),
        },
        material: {
            getLayer: () => nodeLayer,
            visible: true,
        },
        getExtentsByProjection: () => 0,
    };
    const layer = {
        id: 'test',
        visible: true,
        opacity: 1.0,
    };

    it('should correctly initialize opacity & visibility', () => {
        node.layerUpdateState.test.failure(new Date());
        updateLayeredMaterialNodeImagery(null, layer, node, node.parent);
        assert.equal(nodeLayer.opacity, layer.opacity);
        assert.equal(nodeLayer.visible, layer.visible);
    });
    it('should update material opacity & visibility', () => {
        layer.opacity = 0.5;
        layer.visible = false;
        updateLayeredMaterialNodeImagery(null, layer, node, node.parent);
        assert.equal(nodeLayer.opacity, layer.opacity);
        assert.equal(nodeLayer.visible, layer.visible);
    });
    it('should update material opacity & visibility even if layer is cannot be updated', () => {
        node.layerUpdateState.test.noMoreUpdatePossible();
        layer.opacity = 0.75;
        updateLayeredMaterialNodeImagery(null, layer, node, node.parent);
        assert.equal(nodeLayer.opacity, layer.opacity);
        assert.equal(nodeLayer.visible, layer.visible);
    });
});
