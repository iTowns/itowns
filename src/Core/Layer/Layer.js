import { EventDispatcher } from 'three';

/**
 * Fires when layer sequence change (meaning when the order of the layer changes in the view)
 * @event Layer#sequence-property-changed
 * @property new {object}
 * @property new.sequence {number} the new value of the layer sequence
 * @property previous {object}
 * @property previous.sequence {number} the previous value of the layer sequence
 * @property target {Layer} dispatched on layer
 * @property type {string} sequence-property-changed
*/
/**
 * Fires when layer opacity change
 * @event Layer#opacity-property-changed
 * @property new {object}
 * @property new.opacity {object} the new value of the layer opacity
 * @property previous {object}
 * @property previous.opacity {object} the previous value of the layer opacity
 * @property target {Layer} dispatched on layer
 * @property type {string} opacity-property-changed
*/
/**
 * Fires when layer visibility change
 * @event Layer#visible-property-changed
 * @property new {object}
 * @property new.visible {object} the new value of the layer visibility
 * @property previous {object}
 * @property previous.visible {object} the previous value of the layer visibility
 * @property target {Layer} dispatched on layer
 * @property type {string} visible-property-changed
*/

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

/**
 * A GeometryLayer defines a geometry: globe, plane or pointcloud.
 * This geometry can then be used to display other data, like color layers.
 * @constructor
 * @param {string} id - unique id
 * @param {Object} object3d - the THREE.Object3D that will be the parent of the layer's object hierarchy
 */
function GeometryLayer(id, object3d) {
    if (!id) {
        throw new Error('Missing id parameter (GeometryLayer must have a unique id defined)');
    }
    if (!object3d || !object3d.isObject3D) {
        throw new Error('Missing/Invalid object3d parameter (must be a three.js Object3D instance)');
    }
    this._attachedLayers = [];

    if (object3d && object3d.type === 'Group' && object3d.name === '') {
        object3d.name = id;
    }

    Object.defineProperty(this, 'object3d', {
        value: object3d,
        writable: false,
    });

    Object.defineProperty(this, 'id', {
        value: id,
        writable: false,
    });

    this.postUpdate = () => {};
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
 * @constructor
 * @protected
 * @param      {String}  id
 */
function Layer(id) {
    Object.defineProperty(this, 'id', {
        value: id,
        writable: false,
    });
}

Layer.prototype = Object.create(EventDispatcher.prototype);
Layer.prototype.constructor = Layer;

const ImageryLayers = {
    // move layer to new index
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

/**
 * Interface implemented by {@link GeometryLayer} instances capable of displaying color layers
 * @interface CanDisplayColorLayer
 */
/**
 * Add a color layer to display on this geometry
 *
 * @function
 * @name CanDisplayColorLayer#addColorLayer
 * @param {Object} colorLayer - property bag defining the layer to display.
 * @param {string} colorLayer.id - unique identifier of this layer
 * @param {string} colorLayer.protocol - one of wms, wmts, wmtsc, tms, static.
 * Each protocol has a set of specific options that are documented in their respective providers.
 * @param {Extent} extent - Extent covered by the layer. Note that it can be different
 * than the extent of the underlying geometry.
 * @param {number} colorLayer.strategy.type - Strategy to use to download elements.
 */
/**
 * Remove a displayed color layer
 *
 * @function
 * @name CanDisplayColorLayer#removeColorLayer
 * @param {({Layer}|string)} - the layer to remove or its id
 */

 /**
 * Interface implemented by {@link GeometryLayer} instances capable of displaying color layers
 * @interface CanDisplayElevationLayer
 */
/**
 * Use an elevation data source to deform the underlying geometry
 *
 * @function
 * @name CanDisplayElevationLayer#addElevationLayer
 * @param {Object} elevationLayer - property bag defining the layer to display.
 * @param {string} elevationLayer.id - unique identifier of this layer
 * @param {string} elevationLayer.protocol - one of wms, wmts, wmtsc, static.
 * Each protocol has a set of specific options that are documented in their respective providers.
 * @param {Extent} extent - Extent covered by the layer. Note that it can be different
 * than the extent of the underlying geometry.
 * @param {number} elevationLayer.strategy.type - Strategy to use to download elements.
 */
/**
 * Remove an elevation layer
 *
 * @function
 * @name CanDisplayElevationLayer#removeElevationLayer
 * @param {({Layer}|string)} - the layer to remove or its id
 */

 /**
 * Interface implemented by {@link GeometryLayer} instances capable of displaying a feature layers
 * @interface CanDisplayFeatureLayer
 */
/**
 * Display a feature layers on the underlying geometry
 *
 * @function
 * @name CanDisplayFeatureLayer#addFeatureLayer
 * @param {Object} featureLayer - property bag defining the layer to display.
 * @param {string} featureLayer.id - unique identifier of this layer. See FeatureProvider for valid options.
 */
/**
 * Remove a feature layer
 *
 * @function
 * @name CanDisplayFeatureLayer#removeFeatureLayer
 * @param {({Layer}|string)} - the layer to remove or its id
 */

export { GeometryLayer, Layer, ImageryLayers };
