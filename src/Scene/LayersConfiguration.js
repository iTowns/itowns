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

    // color layers state (visibility, opacity)
    this.colorLayersState = {};
}

LayersConfiguration.prototype.constructor = LayersConfiguration;

LayersConfiguration.prototype.addElevationLayer = function(layer) {
    this.elevationLayers.push(layer);
}

LayersConfiguration.prototype.addColorLayer = function(layer) {
    this.colorLayers.push(layer);
    this.colorLayersState[layer.id] = {
        visible: true,
        opacity: 1.0,
        sequence: this.colorLayers.length - 1
    };
}

LayersConfiguration.prototype.removeColorLayer = function(id) {
    if (this.colorLayersState[id]) {
        this.colorLayers.filter(function(l) {
            return l.id != id;
        });
        this.colorLayers[id] = undefined;
        return true;
    }
    return false;
}

LayersConfiguration.prototype.getColorLayers = function() {
    return this.colorLayers;
}

LayersConfiguration.prototype.getColorLayersId = function() {
    return this.colorLayers.map(function(l) {
        return l.id;
    });
}

LayersConfiguration.prototype.addGeometryLayer = function(layer) {
    this.geometryLayers.push(layer);
}

LayersConfiguration.prototype.getGeometryLayers = function() {
    return this.geometryLayers;
}

LayersConfiguration.prototype.getElevationLayers = function() {
    return this.elevationLayers;
}

LayersConfiguration.prototype.setLayerOpacity = function(id, opacity) {
    if (this.colorLayersState[id]) {
        this.colorLayersState[id].opacity = opacity;
    }
}

LayersConfiguration.prototype.setLayerVisibility = function(id, visible) {
    if (this.colorLayersState[id]) {
        this.colorLayersState[id].visible = visible;
    }
}

LayersConfiguration.prototype.isColorLayerVisible = function(id) {
    return this.colorLayersState[id].visible;
}

LayersConfiguration.prototype.getColorLayerOpacity = function(id) {
    return this.colorLayersState[id].opacity;
}

LayersConfiguration.prototype.moveLayerToIndex = function(id, newSequence) {
    if (this.colorLayersState[id]) {
        var current = this.colorLayersState[id].sequence;

        for (var i in this.colorLayersState) {
            var state = this.colorLayersState[i];
            if (state.sequence === newSequence) {
                state.sequence = current;
                this.colorLayersState[id].sequence = newSequence;
                break;
            }
        }
    }
};

LayersConfiguration.prototype.moveLayerDown = function(id) {
    if (this.colorLayersState[id] && this.colorLayersState[id].sequence > 0) {
        this.moveLayerToIndex(id, this.colorLayersState[id].sequence - 1);
    }
};

LayersConfiguration.prototype.moveLayerUp = function(id) {
    if (this.colorLayersState[id] && this.colorLayersState[id].sequence < this.colorLayers.length - 1) {
        this.moveLayerToIndex(id, this.colorLayersState[id].sequence + 1);
    }
};

LayersConfiguration.prototype.getColorLayersIdOrderedBySequence = function() {
    var seq = this.colorLayers.map(function(l) {
        return l.id;
    });
    seq.sort(
        function(a, b) {
            return this.colorLayersState[a].sequence - this.colorLayersState[b].sequence;
        }.bind(this)
    );
    return seq;
}

export default LayersConfiguration;
