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

/**
 * Return the name of the control.
 * @constructor
 * @return     {name}  The name.
 */

Control.prototype.getName = function () {
    return this.pName;
};

Control.prototype.getMap = function () {
    // TODO : Implement Me

};

/*
 * Return the element used by the control to display its GUI.
 * @constructor
 * @return     {element}  The element.
*/

Control.prototype.getElement = function () {
    return this.pElement;
};

/**
 * Return the options of the control.
 * @constructor
 * @return     {object}  Object.
 */

Control.prototype.getOptions = function () {
    this.options = this.options || '';
    return this.options;
};

/**
 * Change the options of the control.
 * @constructor
 * @param {object} pOptions - The new options of the conrtol.
 */

Control.prototype.setOptions = function (pOptions) {
    this.pName = pOptions.name;
    this.pElement = pOptions.element;
    this.options = pOptions.options;
};

Control.prototype.listenToMap = function (pEventName, pCallback) {
    document.getElementById('viewerDiv').addEventListener(pEventName, pCallback, false);
};

export default Control;
