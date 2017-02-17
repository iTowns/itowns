/**
 * Generated On: 2016-11-22
 * Class: Controls
 * Description: Create a widget.
 */

function Widget(pName, pElement, options) {
    this.pName = pName;
    this.pElement = pElement;
    this.options = options;
    this._map = null;
}

/**
 * Return the name of the widget.
 * @constructor
 * @return     {name}  The name.
 */

Widget.prototype.getName = function getName() {
    return this.pName;
};

/*
 * Return the element used by the widget to display its GUI.
 * @constructor
 * @return     {element}  The element.
*/

Widget.prototype.getElement = function getElement() {
    return this.pElement;
};

/**
 * Return the options of the widget.
 * @constructor
 * @return     {object}  Object.
 */

Widget.prototype.getOptions = function getOptions() {
    this.options = this.options || {};
    return this.options;
};

/**
 * Change the options of the widget.
 * @constructor
 * @param {object} pOptions - The new options of the conrtol.
 */

Widget.prototype.setOptions = function setOptions(pOptions) {
    this.pName = pOptions.name;
    this.pElement = pOptions.element;
    this.options = pOptions.options;
};

/**
 * Listen to an event linked to the map.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

Widget.prototype.listenToMap = function listenToMap(pEventName, pCallback) {
    document.getElementById('viewerDiv').addEventListener(pEventName, pCallback, false);
};

/**
 * Remove an event linked to the map.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

Widget.prototype.removeFromMap = function removeFromMap(pEventName, pCallback) {
    document.getElementById('viewerDiv').removeEventListener(pEventName, pCallback, false);
};

/**
 * Get the Map associated with the widget. Undefined if the widget is not added to a map.
 * @constructor
 */

Widget.prototype.getMap = function getMap() {
    return this._map;
};

/**
 * Associate a map to a widget.
 * @constructor
 */

Widget.prototype.setMap = function setMap(map) {
    if (this._map) {
        this.options.div.removeChild(this.pElement);
    }
    this._map = map;
    if (this._map) {
        var element = this.pElement;
        this.options.div.appendChild(element);
    }
};

/* export default Widget; */
