/**
 * SceneConfiguration holds the layers added to the Viewer and their respective configuration.
 * Layer's config is a simply JS object so it can store any kind of value.
 */

/*
    Layers are "something" that produce a visual result.
    They're composed of an 'id' and an 'update' function. As they are plain JS objects they can have as much
    properties as the user needs.

    Layer can be chained. Connected layers will only get called if their ascendant returns something to update.
    A chain link stores a layer and optionnal next links.

    Some examples. If a user wants to:
      - display a globe: he'll add a [geometry] layer, configured to produce ellispoid-based tiles
      - display imagery from a WMTS server: she'll attach a [imagery] layer to the globe layer. This [imagery] layer will
        download and apply image from the server.
      - display WFS building: he'll add a [feature] layer, querying WFS server and instanciating 3d model
      - change building color based on current time: she'll add a [processing] layer, attached to the 3d model layer
*/

function SceneConfiguration() {
    // layerChains stored the first layer links of each layer chain
    this.layerChains = [];

    // layers state (visibility, opacity)
    this.layersState = {};
}

// Helper func to call fn() on each layer
function _traverseLayers(fn, link) {
    fn(link.layer);
    for (const lk of link.nextLayerLinks) {
        _traverseLayers(fn, lk);
    }
}

// Helper func to call fn() on each link
function _traverseLayerLinks(fn, link) {
    fn(link);
    for (const lk of link.nextLayerLinks) {
        _traverseLayerLinks(fn, lk);
    }
}

/**
 * Add a layer to the scene.
 * If parentLayerId is a valid layer id, the layer will be attached to parentLayerId
 */
SceneConfiguration.prototype.attach = function attach(layer, parentLayerId) {
    if (layer.id in this.layersState) {
        throw new Error(`Layer id ${layer.id} already added`);
    }
    if (!layer.update || !layer.update) {
        throw new Error(`Invalid layer ${layer.id} definition: (missing update and/or id property`);
    }

    if (parentLayerId === undefined) {
        this.layerChains.push({ layer, nextLayerLinks: [] });
    } else if (!(parentLayerId in this.layersState)) {
        throw new Error(`Cannot attach layer ${layer.id} to non-added layer ${parentLayerId}`);
    } else {
        // traverse stages and attach as a child of parentLayerId
        this.traverseLayerLinks((link) => {
            if (link.layer.id === parentLayerId) {
                link.nextLayerLinks.push({ layer, nextLayerLinks: [] });
            }
        });
    }

    this.layersState[layer.id] = {};
};

SceneConfiguration.prototype.detach = function detach(id) {
    if (this.layersState[id]) {
        for (let i = 0; i < this.layerChains.length; i++) {
            const link = this.layerChains[i];
            if (link.layer.id === id) {
                this.layerChains.splice(i, 1);
                break;
            }
        }
        this.traverseLayerLinks((link) => {
            for (let i = 0; i < link.nextLayerLinks.length; i++) {
                if (link.nextLayerLinks[i].layer.id === id) {
                    link.nextLayerLinks.splice(i, 1);
                }
            }
        });


        delete this.layersState[id];
        return true;
    }
    return false;
};

SceneConfiguration.prototype.traverseLayers = function traverseLayers(fn) {
    for (const firstLink of this.layerChains) {
        _traverseLayers(fn, firstLink);
    }
};

SceneConfiguration.prototype.traverseLayerLinks = function traverseLayerLinks(fn) {
    for (const firstLink of this.layerChains) {
        _traverseLayerLinks(fn, firstLink);
    }
};

SceneConfiguration.prototype.setLayerAttribute = function setLayerAttribute(id, attribute, value) {
    if (this.layersState[id]) {
        this.layersState[id][attribute] = value;
    } else {
        // eslint-disable-next-line no-console
        console.warn(`Invalid layer id '${id}'. Ignoring attribute definition`);
    }
};

SceneConfiguration.prototype.getLayerAttribute = function getLayerAttribute(id, attribute) {
    return this.layersState[id][attribute];
};

SceneConfiguration.prototype.getLayers = function getLayers(filter) {
    const result = [];
    this.traverseLayers((layer) => {
        if (!filter || filter(layer, this.layersState[layer.id])) {
            result.push(layer);
        }
    });
    return result;
};

// The following code is specific to color layers when using LayeredMaterial, so it probably doesn't
// belong tto this file.
SceneConfiguration.prototype.moveLayerToIndex = function moveLayerToIndex(id, newIndex) {
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
    }
};

SceneConfiguration.prototype.moveLayerDown = function moveLayerDown(id) {
    if (this.layersState[id] && this.layersState[id].sequence > 0) {
        this.moveLayerToIndex(id, this.layersState[id].sequence - 1);
    }
};

SceneConfiguration.prototype.moveLayerUp = function moveLayerUp(id) {
    if (this.layersState[id] && this.layersState[id].sequence) {
        this.moveLayerToIndex(id, this.layersState[id].sequence + 1);
    }
};

SceneConfiguration.prototype.getColorLayersIdOrderedBySequence = function getColorLayersIdOrderedBySequence() {
    var seq = this.getLayers(l => this.getLayerAttribute(l.id, 'type') === 'color').map(l => l.id);
    seq.sort((a, b) => this.layersState[a].sequence - this.layersState[b].sequence);
    return seq;
};

export default SceneConfiguration;
