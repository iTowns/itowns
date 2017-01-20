function GeometryLayer(i) {
    this._attachedLayers = [];

    Object.defineProperty(this, 'id', {
        value: i,
        writable: false,
    });
}

GeometryLayer.prototype.attach = function attach(layer) {
    if (!layer.update) {
        throw new Error(`Missing 'update' function -> can't attach layer ${layer._id}`);
    }
    this._attachedLayers.push(layer);
};

GeometryLayer.prototype.detach = function detach(layer) {
    const count = this._attachedLayers.length;
    this._attachedLayers = this._attachedLayers.filter(attached => attached.id != layer.id);
    return this._attachedLayers.length < count;
};


function Layer(i) {
    Object.defineProperty(this, 'id', {
        value: i,
        writable: false,
    });
}

const ImageryLayers = {
    moveLayerToIndex: function moveLayerToIndex(layer, newIndex, imageryLayers) {
        var oldIndex = layer.sequence;
        for (const imagery of imageryLayers) {
            if (imagery.sequence === newIndex) {
                imagery.sequence = oldIndex;
                layer.sequence = newIndex;
                break;
            }
        }
    },

    moveLayerDown: function moveLayerDown(layer, imageryLayers) {
        if (layer.sequence > 0) {
            this.moveLayerToIndex(layer, layer.sequence - 1, imageryLayers);
        }
    },

    moveLayerUp: function moveLayerUp(layer, imageryLayers) {
        const m = imageryLayers.length - 1;
        if (layer.sequence < m) {
            this.moveLayerToIndex(layer, layer.sequence + 1, imageryLayers);
        }
    },

    getColorLayersIdOrderedBySequence: function getColorLayersIdOrderedBySequence(imageryLayers) {
        const copy = Array.from(imageryLayers);
        copy.sort((a, b) => a.sequence - b.sequence);
        return copy.map(l => l.id);
    },
};

export { GeometryLayer, Layer, ImageryLayers };
