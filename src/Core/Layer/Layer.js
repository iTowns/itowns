import { EventDispatcher } from 'three';


export const defineLayerProperty = function defineLayerProperty(layer, propertyName, defaultValue, onChange) {
    const existing = Object.getOwnPropertyDescriptor(layer, propertyName);
    if (!existing || !existing.set) {
        var property = layer[propertyName] == undefined ? defaultValue : layer[propertyName];
        Object.defineProperty(layer,
            propertyName,
            { get: () => property,
                set: (newValue) => {
                    if (property !== newValue) {
                        const event = { type: `${propertyName}-property-changed`, previous: {}, new: {} };
                        event.previous[propertyName] = property;
                        event.new[propertyName] = newValue;
                        property = newValue;
                        if (onChange) {
                            onChange(layer, propertyName);
                        }
                        layer.dispatchEvent(event);
                    }
                } });
    }
};

function GeometryLayer(i) {
    this._attachedLayers = [];

    Object.defineProperty(this, 'id', {
        value: i,
        writable: false,
    });
}

GeometryLayer.prototype = Object.create(EventDispatcher.prototype);
GeometryLayer.prototype.constructor = GeometryLayer;

GeometryLayer.prototype.attach = function attach(layer) {
    if (!layer.update) {
        throw new Error(`Missing 'update' function -> can't attach layer ${layer.id}`);
    }
    this._attachedLayers.push(layer);
};

GeometryLayer.prototype.detach = function detach(layer) {
    const count = this._attachedLayers.length;
    this._attachedLayers = this._attachedLayers.filter(attached => attached.id != layer.id);
    return this._attachedLayers.length < count;
};

/**
 * @class      Layer (name)
 * Don't use directly constructor to instance a new Layer
 * use addLayer in {@link View}
 * @example
 * // add and create a new Layer
 * const newLayer = view.addLayer({options});
 *
 * // Change layer's visibilty
 * const layerToChange = view.getLayers(layer => layer.id == 'idLayerToChange')[0];
 * layerToChange.visible = false;
 * view.notifyChange(true); // update viewer
 *
 * // Change layer's opacity
 * const layerToChange = view.getLayers(layer => layer.id == 'idLayerToChange')[0];
 * layerToChange.opacity = 0.5;
 * view.notifyChange(true); // update viewer
 *
 * // Listen properties
 * const layerToListen = view.getLayers(layer => layer.id == 'idLayerToListen')[0];
 * layerToListen.addEventListener('visible-property-changed', (event) => console.log(event));
 * layerToListen.addEventListener('opacity-property-changed', (event) => console.log(event));
 * @protected
 * @param      {String}  id
 */
function Layer(i) {
    Object.defineProperty(this, 'id', {
        value: i,
        writable: false,
    });
}

Layer.prototype = Object.create(EventDispatcher.prototype);
Layer.prototype.constructor = Layer;

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
