/**
 * Generated On: 2015-10-5
 * Class: GuiTools
 * Description: Classe pour créer un menu.
 */

/* global dat,viewerDiv, itowns */

dat.GUI.prototype.removeFolder = function removeFolder(name) {
    var folder = this.__folders[name];
    if (!folder) {
        return;
    }
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
};

dat.GUI.prototype.colorLayerFolder = function colorLayerFolder(name, value) {
    var folder = this.__folders[name];
    var title;
    if (!folder) {
        return;
    }
    title = folder.__ul.getElementsByClassName('title')[0];

    if (title.style) {
        title.style.background = value;
    }
};

dat.GUI.prototype.hasFolder = function hasFolder(name) {
    return this.__folders[name];
};

function GuiTools(domId, view, w) {
    var width = w || 245;
    this.gui = new dat.GUI({ autoPlace: false, width: width });
    this.gui.domElement.id = domId;
    viewerDiv.appendChild(this.gui.domElement);
    this.colorGui = this.gui.addFolder('Color Layers');
    this.elevationGui = this.gui.addFolder('Elevation Layers');

    if (view) {
        this.view = view;
        view.addEventListener('layers-order-changed', (function refreshColorGui() {
            var i;
            var colorLayers = view.getLayers(function filter(l) { return l.isColorLayer; });
            for (i = 0; i < colorLayers.length; i++) {
                this.removeLayersGUI(colorLayers[i].id);
            }

            this.addImageryLayersGUI(colorLayers);
        }).bind(this));
    }
}

GuiTools.prototype.addLayerGUI = function fnAddLayerGUI(layer) {
    if (layer.isColorLayer) {
        this.addImageryLayerGUI(layer);
    } else if (layer.isElevationLayer) {
        this.addElevationLayerGUI(layer);
    }
};

GuiTools.prototype.addLayersGUI = function fnAddLayersGUI() {
    function filterColor(l) { return l.isColorLayer; }
    function filterElevation(l) { return l.isElevationLayer; }
    this.addImageryLayersGUI(this.view.getLayers(filterColor));
    this.addElevationLayersGUI(this.view.getLayers(filterElevation));
    // eslint-disable-next-line no-console
    console.info('menu initialized');
};

GuiTools.prototype.addImageryLayerGUI = function addImageryLayerGUI(layer) {
    if (this.colorGui.hasFolder(layer.id)) { return; }
    var folder = this.colorGui.addFolder(layer.id);
    folder.add({ visible: layer.visible }, 'visible').onChange((function updateVisibility(value) {
        layer.visible = value;
        this.view.notifyChange(layer);
    }).bind(this));
    folder.add({ opacity: layer.opacity }, 'opacity').min(0.0).max(1.0).onChange((function updateOpacity(value) {
        layer.opacity = value;
        this.view.notifyChange(layer);
    }).bind(this));
    folder.add({ frozen: layer.frozen }, 'frozen').onChange((function updateFrozen(value) {
        layer.frozen = value;
        this.view.notifyChange(layer);
    }).bind(this));
};

GuiTools.prototype.addElevationLayerGUI = function addElevationLayerGUI(layer) {
    if (this.elevationGui.hasFolder(layer.id)) { return; }
    var folder = this.elevationGui.addFolder(layer.id);
    folder.add({ frozen: layer.frozen }, 'frozen').onChange(function refreshFrozenGui(value) {
        layer.frozen = value;
    });
};

GuiTools.prototype.addImageryLayersGUI = function addImageryLayersGUI(layers) {
    var i;
    var seq = itowns.ImageryLayers.getColorLayersIdOrderedBySequence(layers);
    var sortedLayers = layers.sort(function comp(a, b) {
        return seq.indexOf(a.id) < seq.indexOf(b.id);
    });
    for (i = 0; i < sortedLayers.length; i++) {
        this.addImageryLayerGUI(sortedLayers[i]);
    }
};

GuiTools.prototype.addElevationLayersGUI = function addElevationLayersGUI(layers) {
    var i;
    for (i = 0; i < layers.length; i++) {
        this.addElevationLayerGUI(layers[i]);
    }
};

GuiTools.prototype.removeLayersGUI = function removeLayersGUI(nameLayer) {
    this.colorGui.removeFolder(nameLayer);
};

GuiTools.prototype.addGUI = function addGUI(name, value, callback) {
    this[name] = value;
    this.gui.add(this, name).onChange(callback);
};

GuiTools.prototype.colorLayerFolder = function colorLayerFolder(nameLayer, value) {
    this.colorGui.colorLayerFolder(nameLayer, value);
};

// Recursive function that creates an HTML List from a javascript
// object
// eslint-disable-next-line no-unused-vars
function createHTMLListFromObject(jsObject) {
    var list = document.createElement('ul');
    // Change the padding (top: 0, right:0, bottom:0 and left:1.5)
    list.style.padding = '0 0 0 1.5rem';
    // For each property of the object
    Object.keys(jsObject).forEach(function _(property) {
        // create item
        var item = document.createElement('li');
        // append property name
        item.appendChild(document.createTextNode(property));

        if (jsObject[property] === null) {
            jsObject[property] = 'null';
        }

        if (typeof jsObject[property] === 'object') {
            // if property value is an object, then recurse to
            // create a list from it
            item.appendChild(
                createHTMLListFromObject(jsObject[property]));
        } else {
            // else append the value of the property to the item
            item.appendChild(document.createTextNode(': '));
            item.appendChild(
                document.createTextNode(jsObject[property]));
        }
        list.appendChild(item);
    });
    return list;
}
