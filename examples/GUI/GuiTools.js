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

dat.GUI.prototype.hideFolder = function hideFolder(name, value) {
    var folder = this.__folders[name];
    if (!folder) {
        return;
    }
    folder.__ul.hidden = value;
};

function GuiTools(domId, view, width = 245) {
    this.gui = new dat.GUI({ autoPlace: false, width });
    this.gui.domElement.id = domId;
    viewerDiv.appendChild(this.gui.domElement);
    this.colorGui = this.gui.addFolder('Color Layers');
    this.elevationGui = this.gui.addFolder('Elevation Layers');

    if (view) {
        view.addEventListener('layers-order-changed', () => {
            for (const layer of view.getLayers(l => l.type === 'color')) {
                this.removeLayersGUI(layer.id);
            }

            const colorLayers = view.getLayers(l => l.type === 'color');
            this.addImageryLayersGUI(colorLayers);
        });
    }
}

GuiTools.prototype.addImageryLayerGUI = function addImageryLayerGUI(layer) {
    var folder = this.colorGui.addFolder(layer.id);
    folder.add({ visible: true }, 'visible').onChange((value) => {
        layer.visible = value;
        this.view.notifyChange(true);
    });
    folder.add({ opacity: 1.0 }, 'opacity').min(0.0).max(1.0).onChange((value) => {
        layer.opacity = value;
        this.view.notifyChange(true);
    });
    folder.add({ frozen: false }, 'frozen').onChange((value) => {
        layer.frozen = value;
        this.view.notifyChange(true);
    });
};

GuiTools.prototype.addElevationLayerGUI = function addElevationLayerGUI(layer) {
    var folder = this.elevationGui.addFolder(layer.id);
    folder.add({ frozen: false }, 'frozen').onChange((value) => {
        layer.frozen = value;
    });
};

GuiTools.prototype.addImageryLayersGUI = function addImageryLayersGUI(layers) {
    const seq = itowns.ImageryLayers.getColorLayersIdOrderedBySequence(layers);

    for (const layer of layers.sort((a, b) => seq.indexOf(a.id) < seq.indexOf(b.id))) {
        this.addImageryLayerGUI(layer);
    }
};

GuiTools.prototype.addElevationLayersGUI = function addElevationLayersGUI(layers) {
    for (var i = 0; i < layers.length; i++) {
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

GuiTools.prototype.hideFolder = function hideFolder(nameLayer, value) {
    this.colorGui.hideFolder(nameLayer, value);
};
