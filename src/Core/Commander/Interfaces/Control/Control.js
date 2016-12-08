/**
 * Generated On: 2016-11-22
 * Class: Controls
 * Description: Cette Classe construit un control.
 */

import ApiGlobe from 'Core/Commander/Interfaces/ApiInterface/ApiGlobe';

function Control(pName, pElement, options) {
    this.pName = pName;
    this.pElement = pElement;
    this.options = options;
    this.map_ = null;
    this.api = ApiGlobe;
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

/**
 * Listen to an event linked to the globe.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

Control.prototype.listenToMap = function (pEventName, pCallback) {
    document.getElementById('viewerDiv').addEventListener(pEventName, pCallback, false);
};

Control.prototype.getGlobe = function () {
    return this.map_;
};

Control.prototype.setGlobe = function (map) {
    if (this.map_) {
        document.getElementById(this.options.div.id).removeChild(this.pElement);
    }
    this.map_ = map;
    if (this.map_) {
        var element = this.pElement;
        document.getElementById(this.options.div.id).appendChild(element);
    }
};

/* Control.prototype.onmapchange (pMap) {
    if (this.map_) {

    } else {

    }
}; */

export default Control;
