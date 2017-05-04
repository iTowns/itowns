/**
 * Generated On: 2015-10-5
 * Class: Layer
 * Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
 *
 */

import { EventDispatcher } from 'three';

/**
 *
 * @param {type} Node
 * @param {type} InterfaceCommander
 * @param {type} Projection
 * @param {type} NodeMesh
 * @returns {Layer_L15.Layer}
 */
function LayersConfiguration() {
    // source layers
    this.geometryLayers = [];
    this.colorLayers = [];
    this.elevationLayers = [];
    this.lightingLayers = [];

    this.lightingLayers[0] = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    // layers state (visibility, opacity)
    this.layersState = {};
}

LayersConfiguration.prototype = Object.create(EventDispatcher.prototype);
LayersConfiguration.prototype.constructor = LayersConfiguration;

function defaultState(seq) {
    return {
        // / shared attributes
        // if true, stop fetching new data
        frozen: false,
        // / color layers only attributes
        // is this layer displayed
        visible: true,
        // layer's opacity (0.0 = transparent)
        opacity: 1.0,
        // rendering order
        sequence: seq || 0,
    };
}

LayersConfiguration.prototype.dispatchLayerAddedEvent = function dispatchLayerAddedEvent(layer) {
    this.dispatchEvent({
        type: 'layeradded',
        layerId: layer.id,
    });
};

LayersConfiguration.prototype.addElevationLayer = function addElevationLayer(layer) {
    this.elevationLayers.push(layer);
    this.layersState[layer.id] = defaultState();
    this.dispatchLayerAddedEvent(layer);
};

LayersConfiguration.prototype.addColorLayer = function addColorLayer(layer) {
    this.colorLayers.push(layer);
    this.layersState[layer.id] = defaultState(this.colorLayers.length - 1);
    this.dispatchLayerAddedEvent(layer);
};

LayersConfiguration.prototype.addGeometryLayer = function addGeometryLayer(layer) {
    this.geometryLayers.push(layer);
    this.layersState[layer.id] = defaultState();
    this.dispatchLayerAddedEvent(layer);
};

LayersConfiguration.prototype.removeColorLayer = function removeColorLayer(id) {
    if (this.layersState[id]) {
        this.colorLayers = this.colorLayers.filter(l => l.id != id);
        this.dispatchEvent({
            type: 'layerremoved',
            layerId: id,
        });
        delete this.layersState[id];
        return true;
    }
    return false;
};

LayersConfiguration.prototype.getLayers = function getLayers() {
    return [...this.colorLayers, ...this.elevationLayers, ...this.geometryLayers];
};

LayersConfiguration.prototype.getColorLayers = function getColorLayers() {
    return this.colorLayers;
};

LayersConfiguration.prototype.getColorLayersId = function getColorLayersId() {
    return this.colorLayers.map(l => l.id);
};

LayersConfiguration.prototype.getGeometryLayers = function getGeometryLayers() {
    return this.geometryLayers;
};

LayersConfiguration.prototype.getElevationLayers = function getElevationLayers() {
    return this.elevationLayers;
};

LayersConfiguration.prototype.dispatchEventLayerChanged = function dispatchEventLayerChanged(id, oldindex, oldopacity, oldvisibility) {
    this.dispatchEvent({
        type: 'layerchanged',
        layerId: id,
        old: {
            index: oldindex,
            opacity: oldopacity,
            visibility: oldvisibility,
        },
        new: {
            index: this.layersState[id].sequence,
            opacity: this.layersState[id].opacity,
            visibility: this.layersState[id].visible,
        },
    });
};

LayersConfiguration.prototype.setLayerOpacity = function setLayerOpacity(id, opacity) {
    if (this.layersState[id]) {
        const oldOpacity = this.layersState[id].opacity;
        this.layersState[id].opacity = opacity;
        this.dispatchEvent({
            type: 'layerchanged:opacity',
            layerId: id,
            old: { opacity: oldOpacity },
            new: { opacity: this.layersState[id].opacity },
        });
        this.dispatchEventLayerChanged(id, this.layersState[id].sequence, oldOpacity, this.layersState[id].visible);
    }
};

LayersConfiguration.prototype.setLayerVisibility = function setLayerVisibility(id, visible) {
    if (this.layersState[id]) {
        const oldVisibility = this.layersState[id].visible;
        this.layersState[id].visible = visible;
        this.dispatchEvent({
            type: 'layerchanged:visible',
            layerId: id,
            old: { visibility: oldVisibility },
            new: { visibility: this.layersState[id].visible },
        });
        this.dispatchEventLayerChanged(id, this.layersState[id].sequence, this.layersState[id].opacity, oldVisibility);
    }
};

LayersConfiguration.prototype.isColorLayerVisible = function isColorLayerVisible(id) {
    return this.layersState[id].visible;
};

LayersConfiguration.prototype.getColorLayerOpacity = function getColorLayerOpacity(id) {
    return this.layersState[id].opacity;
};

LayersConfiguration.prototype.setLayerFreeze = function setLayerFreeze(id, frozen) {
    if (this.layersState[id]) {
        this.layersState[id].frozen = frozen;
    }
};

LayersConfiguration.prototype.isLayerFrozen = function isLayerFrozen(id) {
    return this.layersState[id].frozen;
};


LayersConfiguration.prototype.moveLayerToIndex = function moveLayerToIndex(id, newIndex) {
    if (this.layersState[id]) {
        const oldIndex = this.layersState[id].sequence;
        for (var i in this.layersState) {
            if (Object.prototype.hasOwnProperty.call(this.layersState, i)) {
                var state = this.layersState[i];
                if (state.sequence === newIndex) {
                    state.sequence = oldIndex;
                    this.layersState[id].sequence = newIndex;
                    this.dispatchEvent({
                        type: 'layerchanged:index',
                        layerId: id,
                        old: { index: oldIndex },
                        new: { index: this.layersState[id].sequence },
                    });
                    this.dispatchEventLayerChanged(id, oldIndex, this.layersState[id].opacity, this.layersState[id].visible);
                    break;
                }
            }
        }

        this.colorLayers.splice(newIndex, 0, this.colorLayers.splice(oldIndex, 1)[0]);
    }
};

LayersConfiguration.prototype.moveLayerDown = function moveLayerDown(id) {
    if (this.layersState[id] && this.layersState[id].sequence > 0) {
        this.moveLayerToIndex(id, this.layersState[id].sequence - 1);
    }
};

LayersConfiguration.prototype.moveLayerUp = function moveLayerUp(id) {
    if (this.layersState[id] && this.layersState[id].sequence < this.colorLayers.length - 1) {
        this.moveLayerToIndex(id, this.layersState[id].sequence + 1);
    }
};

LayersConfiguration.prototype.getColorLayersIdOrderedBySequence = function getColorLayersIdOrderedBySequence() {
    var seq = this.colorLayers.map(l => l.id);
    seq.sort((a, b) => this.layersState[a].sequence - this.layersState[b].sequence);
    return seq;
};

export default LayersConfiguration;
