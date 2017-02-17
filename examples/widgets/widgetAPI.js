/* global Widget */
/* global itowns */

function widgetAPI() {
    this.widgets = new Set();
}

/**
 * Add a widget.
 */

widgetAPI.prototype.addWidget = function addWidget(widget) {
    widget.setMap(itowns.viewer.scene.getMap());
    this.widgets.add(widget);
};

/**
 * Returns all widgets.
 * @return     {array}  The array of widgets.
 */

widgetAPI.prototype.getWidgets = function getWidget() {
    return this.widgets;
};

/**
 * Remove a widget.
 * @param {object} Widget - The Widget object.
 */

widgetAPI.prototype.removeWidget = function removeWidget(widget) {
    widget.setMap();
    this.widgets.delete(widget);
};
