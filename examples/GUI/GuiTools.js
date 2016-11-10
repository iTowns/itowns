/**
 * Generated On: 2015-10-5
 * Class: GuiTools
 * Description: Classe pour créer un menu.
 */

function GuiTools(api,domId) {

    this.api = api;
    this.gui = new dat.GUI({ autoPlace : false});
    this.gui.domElement.id = domId;
	viewerDiv.appendChild(this.gui.domElement);
	this.colorGui = this.gui.addFolder('Color Layers');
	this.elevationGui = this.gui.addFolder('Elevation Layers');
}

GuiTools.prototype.addImageryLayerGUI = function (layer) {

		var folder = this.colorGui.addFolder(layer.id);
		folder.add( { visible: true }, 'visible').onChange(function(value) {
			this.api.setLayerVisibility(layer.id, value);
		}.bind(this));
		folder.add( { opacity: 1.0 }, 'opacity').min(0.0).max(1.0).onChange(function(value) {
			this.api.setLayerOpacity(layer.id, value);
		}.bind(this));
		folder.add( { frozen: false }, 'frozen').onChange(function(value) {
			this.api.scene.getMap().layersConfiguration.setLayerFreeze(layer.id, value);
		}.bind(this));
};

GuiTools.prototype.addElevationLayerGUI = function (layer) {

		var folder = this.elevationGui.addFolder(layer.id);
		folder.add( { frozen: false }, 'frozen').onChange(function(value) {
			this.api.scene.getMap().layersConfiguration.setLayerFreeze(layer.id, value);
		}.bind(this));
};

GuiTools.prototype.addImageryLayersGUI = function (layers) {

	for (var i = 0; i < layers.length; i++){
		this.addImageryLayerGUI(layers[i]);
	}
};

GuiTools.prototype.addElevationLayersGUI = function (layers) {

	for (var i = 0; i < layers.length; i++){
		this.addElevationLayerGUI(layers[i]);
	}
};

GuiTools.prototype.addLayersGUI = function (imageryLayers, elevationLayers) {

	this.addImageryLayersGUI(imageryLayers);
	this.addElevationLayersGUI(elevationLayers);
};

GuiTools.prototype.addGUI = function (name,value,callback) {

	this[name] = value;
	this.gui.add(this, name).onChange(callback);
};

//TODO
//GuiTools.prototype.removeImageryLayersGUI = function () {

// };
