/**
 * Generated On: 2016-11-22
 * Class: Controls
 * Description: Cette Classe construit un control.
 */

function Control(pName, pElement, options) {

	this.pName = pName;
	this.pElement = pElement;
	this.options = options;
}

Control.prototype.constructor = Control;

Control.prototype.getName = function() {
	return this.pName;
};

Control.prototype.getMap = function() {
	//TODO : Implement Me

};

Control.prototype.getElement = function() {
	return this.pElement;
};

Control.prototype.getOptions = function() {
	return this.options;
};

/*Control.prototype.setOptions = function(pOptions) {
	//TODO : Implement Me

};*/

//export default Control;