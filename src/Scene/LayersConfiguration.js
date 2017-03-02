/**
 * Generated On: 2015-10-5
 * Class: Layer
 * Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
 *
 */

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

LayersConfiguration.prototype.addElevationLayer = function addElevationLayer(layer) {
    this.elevationLayers.push(layer);
    this.layersState[layer.id] = defaultState();
};

LayersConfiguration.prototype.addColorLayer = function addColorLayer(layer) {
    this.colorLayers.push(layer);
    this.layersState[layer.id] = defaultState(this.colorLayers.length - 1);
};

LayersConfiguration.prototype.addGeometryLayer = function addGeometryLayer(layer) {
    this.geometryLayers.push(layer);
    this.layersState[layer.id] = defaultState();
};

LayersConfiguration.prototype.removeColorLayer = function removeColorLayer(id) {
    if (this.layersState[id]) {
        this.colorLayers = this.colorLayers.filter(l => l.id != id);
        delete this.layersState[id];
        return true;
    }
    return false;
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

LayersConfiguration.prototype.setLayerOpacity = function setLayerOpacity(id, opacity) {
    if (this.layersState[id]) {
        this.layersState[id].opacity = opacity;
    }
};

LayersConfiguration.prototype.setLayerVisibility = function setLayerVisibility(id, visible) {
    if (this.layersState[id]) {
        this.layersState[id].visible = visible;
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
        var oldIndex = this.layersState[id].sequence;
        for (var i in this.layersState) {
            if (Object.prototype.hasOwnProperty.call(this.layersState, i)) {
                var state = this.layersState[i];
                if (state.sequence === newIndex) {
                    state.sequence = oldIndex;
                    this.layersState[id].sequence = newIndex;
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
