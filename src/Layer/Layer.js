import * as THREE from 'three';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from './LayerUpdateStrategy';
import InfoLayer from './InfoLayer';

class Layer extends THREE.EventDispatcher {
    /**
     * Don't use directly constructor to instance a new Layer. Instead, use
     * another available type of Layer, implement a new one inheriting from this
     * one or use {@link View#addLayer}.
     *
     * @constructor
     * @protected
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {string} type - The type of the layer, used to determine
     * operations to do on a layer later in the rendering loop. There are three
     * type of layers in itowns:
     * <ul>
     *  <li><code>color</code>, used for simple layer containing a texture</li>
     *  <li><code>elevation</code>, used for adding an elevation to the globe or
     *  plane the layer is attached to</li>
     *  <li><code>geometry</code>, used for complex layer containing meshes,
     *  like a WFS layer with extruded buildings</li>
     * <ul>
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     *
     * @example
     * // Add and create a new Layer
     * const newLayer = view.addLayer({options});
     *
     * // Change layer's visibilty
     * const layerToChange = view.getLayers(layer => layer.id == 'idLayerToChange')[0];
     * layerToChange.visible = false;
     * view.notifyChange(); // update viewer
     *
     * // Change layer's opacity
     * const layerToChange = view.getLayers(layer => layer.id == 'idLayerToChange')[0];
     * layerToChange.opacity = 0.5;
     * view.notifyChange(); // update viewer
     *
     * // Listen properties
     * const layerToListen = view.getLayers(layer => layer.id == 'idLayerToListen')[0];
     * layerToListen.addEventListener('visible-property-changed', (event) => console.log(event));
     * layerToListen.addEventListener('opacity-property-changed', (event) => console.log(event));
     */
    constructor(id, type, config = {}) {
        super();

        Object.assign(this, config);

        Object.defineProperty(this, 'id', {
            value: id,
            writable: false,
        });

        Object.defineProperty(this, 'type', {
            value: type,
            writable: false,
        });

        // Default properties
        this.options = config.options || {};

        if (!this.updateStrategy) {
            this.updateStrategy = {
                type: STRATEGY_MIN_NETWORK_TRAFFIC,
                options: {},
            };
        }

        // TODO remove this warning and fallback after the release following v2.3.0
        if (!this.format && this.options.mimetype) {
            console.warn('layer.options.mimetype is deprecated, please use layer.format');
            this.format = this.options.mimetype;
        }

        this.defineLayerProperty('frozen', false);

        this.info = new InfoLayer(this);
    }

    /**
     * Defines a property for this layer, with a default value and a callback
     * executed when the property changes.
     * <br><br>
     * When changing the property, it also emits an event, named following this
     * convention: <code>${propertyName}-property-changed</code>, with
     * <code>${propertyName}</code> being replaced by the name of the property.
     * For example, if the added property name is <code>frozen</code>, it will
     * emit a <code>frozen-property-changed</code>.
     * <br><br>
     * @example <caption>The emitted event has some properties assigned to it</caption>
     * event = {
     *     new: {
     *         ${propertyName}: * // the new value of the property
     *     },
     *     previous: {
     *         ${propertyName}: * // the previous value of the property
     *     },
     *     target: Layer // the layer it has been dispatched from
     *     type: string // the name of the emitted event
     * }
     *
     * @param {string} propertyName - The name of the property, also used in
     * the emitted event name.
     * @param {*} defaultValue - The default set value.
     * @param {function} [onChange] - The function executed when the property is
     * changed. Parameters are the layer the property is defined on, and the
     * name of the property.
     */
    defineLayerProperty(propertyName, defaultValue, onChange) {
        const existing = Object.getOwnPropertyDescriptor(this, propertyName);
        if (!existing || !existing.set) {
            let property = this[propertyName] == undefined ? defaultValue : this[propertyName];

            Object.defineProperty(
                this,
                propertyName,
                {
                    get: () => property,
                    set: (newValue) => {
                        if (property !== newValue) {
                            const event = { type: `${propertyName}-property-changed`, previous: {}, new: {} };
                            event.previous[propertyName] = property;
                            event.new[propertyName] = newValue;
                            property = newValue;
                            if (onChange) {
                                onChange(this, propertyName);
                            }
                            this.dispatchEvent(event);
                        }
                    },
                });
        }
    }
}

export default Layer;

export const ImageryLayers = {
    // move this to new index
    // After the modification :
    //      * the minimum sequence will always be 0
    //      * the maximum sequence will always be layers.lenght - 1
    // the ordering of all layers (Except that specified) doesn't change
    moveLayerToIndex: function moveLayerToIndex(layer, newIndex, imageryLayers) {
        newIndex = Math.min(newIndex, imageryLayers.length - 1);
        newIndex = Math.max(newIndex, 0);
        const oldIndex = layer.sequence;

        for (const imagery of imageryLayers) {
            if (imagery.id === layer.id) {
                // change index of specified layer
                imagery.sequence = newIndex;
            } else if (imagery.sequence > oldIndex && imagery.sequence <= newIndex) {
                // down all layers between the old index and new index (to compensate the deletion of the old index)
                imagery.sequence--;
            } else if (imagery.sequence >= newIndex && imagery.sequence < oldIndex) {
                // up all layers between the new index and old index (to compensate the insertion of the new index)
                imagery.sequence++;
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

