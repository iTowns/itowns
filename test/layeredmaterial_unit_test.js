import LayerUpdateState from '../src/Core/Layer/LayerUpdateState';
import { updateLayeredMaterialNodeImagery } from '../src/Process/LayeredMaterialNodeProcessing';
/* global describe, it */

const assert = require('assert');

describe('material state vs layer state', function () {
    let opacity = 0.0;

    const node = {
        parent: { },
        layerUpdateState: {
            test: new LayerUpdateState(),
        },
        material: {
            indexOfColorLayer: () => 0,
            setLayerVisibility: () => {},
            setLayerOpacity: (idx, o) => { opacity = o; },
        },
        isDisplayed: () => true,
    };
    const layer = {
        id: 'test',
        visible: true,
        opacity: 1.0,
    };

    it('should correctly initialize opacity', () => {
        node.layerUpdateState.test.failure(new Date());
        updateLayeredMaterialNodeImagery(null, layer, node);
        assert.equal(opacity, layer.opacity);
    });
    it('should update material opacity', () => {
        layer.opacity = 0.5;
        updateLayeredMaterialNodeImagery(null, layer, node);
        assert.equal(opacity, layer.opacity);
    });
    it('should update material opacity even if layer is cannot be updated', () => {
        node.layerUpdateState.test.noMoreUpdatePossible();
        layer.opacity = 0.75;
        updateLayeredMaterialNodeImagery(null, layer, node);
        assert.equal(opacity, layer.opacity);
    });
});
