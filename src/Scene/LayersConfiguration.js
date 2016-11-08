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

    // layers state (visibility, opacity)
    this.layersState = {};
}

LayersConfiguration.prototype.constructor = LayersConfiguration;

function defaultState(seq) {
    return {
        /// shared attributes
        // if true, stop fetching new data
        frozen: false,

        /// color layers only attributes
        // is this layer displayed
        visible: true,
        // layer's opacity (0.0 = transparent)
        opacity: 1.0,
        // rendering order
        sequence: seq || 0
    };
}

LayersConfiguration.prototype.addElevationLayer = function(layer) {
    this.elevationLayers.push(layer);
    this.layersState[layer.id] = defaultState();
};

LayersConfiguration.prototype.addColorLayer = function(layer) {
    this.colorLayers.push(layer);
    this.layersState[layer.id] = defaultState(this.colorLayers.length - 1);
};

LayersConfiguration.prototype.addGeometryLayer = function(layer) {
    this.geometryLayers.push(layer);
    this.layersState[layer.id] = defaultState();
};

LayersConfiguration.prototype.removeColorLayer = function(id) {
    if (this.layersState[id]) {
        this.colorLayers = this.colorLayers.filter(function(l) {
            return l.id != id;
        });
        delete this.layersState[id];
        return true;
    }
    return false;
};

LayersConfiguration.prototype.getColorLayers = function() {
    return this.colorLayers;
};

LayersConfiguration.prototype.getColorLayersId = function() {
    return this.colorLayers.map(function(l) {
        return l.id;
    });
};

LayersConfiguration.prototype.getGeometryLayers = function() {
    return this.geometryLayers;
};

LayersConfiguration.prototype.getElevationLayers = function() {
    return this.elevationLayers;
};

LayersConfiguration.prototype.setLayerOpacity = function(id, opacity) {
    if (this.layersState[id]) {
        this.layersState[id].opacity = opacity;
    }
};

LayersConfiguration.prototype.setLayerVisibility = function(id, visible) {
    if (this.layersState[id]) {
        this.layersState[id].visible = visible;
    }
};

LayersConfiguration.prototype.isColorLayerVisible = function(id) {
    return this.layersState[id].visible;
};

LayersConfiguration.prototype.getColorLayerOpacity = function(id) {
    return this.layersState[id].opacity;
};

LayersConfiguration.prototype.setLayerFreeze = function(id, frozen) {
    if (this.layersState[id]) {
        this.layersState[id].frozen = frozen;
    }
};

LayersConfiguration.prototype.isLayerFrozen = function(id) {
    return this.layersState[id].frozen;
};


LayersConfiguration.prototype.moveLayerToIndex = function(id, new_index) {
    if (this.layersState[id]) {
        var old_index = this.layersState[id].sequence;
        for (var i in this.layersState) {
            var state = this.layersState[i];
            if (state.sequence === new_index) {
                state.sequence = old_index;
                this.layersState[id].sequence = new_index;
                break;
            }
        }

        this.colorLayers.splice(new_index, 0, this.colorLayers.splice(old_index, 1)[0]);
    }
};

LayersConfiguration.prototype.moveLayerDown = function(id) {
    if (this.layersState[id] && this.layersState[id].sequence > 0) {
        this.moveLayerToIndex(id, this.layersState[id].sequence - 1);
    }
};

LayersConfiguration.prototype.moveLayerUp = function(id) {
    if (this.layersState[id] && this.layersState[id].sequence < this.colorLayers.length - 1) {
        this.moveLayerToIndex(id, this.layersState[id].sequence + 1);
    }
};

LayersConfiguration.prototype.getColorLayersIdOrderedBySequence = function() {
    var seq = this.colorLayers.map(function(l) {
        return l.id;
    });
    seq.sort(
        function(a, b) {
            return this.layersState[a].sequence - this.layersState[b].sequence;
        }.bind(this)
    );
    return seq;
};

export default LayersConfiguration;
