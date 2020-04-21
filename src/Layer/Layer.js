import * as THREE from 'three';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Layer/LayerUpdateStrategy';
import InfoLayer from 'Layer/InfoLayer';
import Source from 'Source/Source';
import { parseSourceData } from 'Provider/DataSourceProvider';

/**
 * @property {boolean} isLayer - Used to checkout whether this layer is a Layer.
 * Default is true. You should not change this, as it is used internally for
 * optimisation.
 * @property {boolean} ready - This property is false when the layer isn't added.
 * It's true when the layer is added and all initializations are done.
 * @property {Source} source - This source determines the datas to be displayed with the layer.
 * The layer determines how this data are displayed.
 * By example:
 * * For ColorLayer/ElevationLayer, the source datas are rasterised (if it's necessary).
 * * For GeometryLayer, the source datas are converted to meshes (not possible for the raster data sources).
 * @property {Promise} whenReady - this promise is resolved when the layer is added and all initializations are done.
 * This promise is resolved with this layer.
 * This promise is returned by [View#addLayer]{@link View}.
 */
class Layer extends THREE.EventDispatcher {
    /**
     * Don't use directly constructor to instance a new Layer. Instead, use
     * another available type of Layer, implement a new one inheriting from this
     * one or use [View#addLayer]{@link View}.
     *
     * @constructor
     * @protected
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     *
     * @example
     * // Add and create a new Layer
     * const newLayer = new Layer('id', options);
     * view.addLayer(newLayer);
     *
     * // Change layer's visibility
     * const layerToChange = view.getLayerById('idLayerToChange');
     * layerToChange.visible = false;
     * view.notifyChange(); // update viewer
     *
     * // Change layer's opacity
     * const layerToChange = view.getLayerById('idLayerToChange');
     * layerToChange.opacity = 0.5;
     * view.notifyChange(); // update viewer
     *
     * // Listen properties
     * const layerToListen = view.getLayerById('idLayerToListen');
     * layerToListen.addEventListener('visible-property-changed', (event) => console.log(event));
     * layerToListen.addEventListener('opacity-property-changed', (event) => console.log(event));
     */
    constructor(id, config = {}) {
        super();
        this.isLayer = true;

        Object.assign(this, config);

        Object.defineProperty(this, 'id', {
            value: id,
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

        this.defineLayerProperty('frozen', false);

        this.info = new InfoLayer(this);

        this.source = this.source || new Source({ url: 'none' });

        this.ready = false;

        this._promises = [];

        this.whenReady = new Promise((re, rj) => {
            this._resolve = re;
            this._reject = rj;
        }).then(() => {
            if (this.source.fetchedData && !this.source.parsedData) {
                return parseSourceData(this.source.fetchedData, this.source.extent, this);
            }
        }).then(() => {
            this.ready = true;
            return this;
        });

        this._promises.push(this.source.whenReady);
    }

    addInitializationStep() {
        // Possibility to add rejection handler, if it's necessary.
        let resolve;
        this._promises.push(new Promise((re) => { resolve = re; }));
        return resolve;
    }

    /**
     * Defines a property for this layer, with a default value and a callback
     * executed when the property changes.
     * <br><br>
     * When changing the property, it also emits an event, named following this
     * convention: `${propertyName}-property-changed`, with `${propertyName}`
     * being replaced by the name of the property.  For example, if the added
     * property name is `frozen`, it will emit a `frozen-property-changed`.
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

    // Placeholder
    // eslint-disable-next-line
    convert(data) {
        return data;
    }

    /**
     * Remove and dispose all objects from layer.
     */
    // eslint-disable-next-line
    delete() {
        console.warn('Function delete doesn\'t exist for this layer');
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
