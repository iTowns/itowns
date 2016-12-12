/**
 * Generated On: 2015-10-5
 * Class: StyleManager
 * Description:
 */

import { Style } from 'Scene/Description/Style';

function StyleManager() {
    this.styles = [];
}

StyleManager.prototype = Object.create(StyleManager.prototype);

StyleManager.prototype.constructor = StyleManager;

StyleManager.prototype.getStyles = function getStyles() {
    return this.styles;
};

StyleManager.prototype.addStyle = function addStyle(style) {
    if (style instanceof Style)
		{ this.styles.push(style); }
};

StyleManager.prototype.getStyle = function getStyle(idStyle) {
    return this.styles.filter(element => element.name === idStyle).pop();
};

StyleManager.prototype.removeStyle = function removeStyle(idStyle) {
    this.styles = this.styles.filter(element => element.name === idStyle);
};

StyleManager.prototype.updateStyle = function updateStyle() {


};

export {
    StyleManager,
};
