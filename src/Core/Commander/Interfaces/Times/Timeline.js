/**
 * Generated On: 2015-10-5
 * Class: Timeline
 */

var EventsManager = require('EventsManager');

function Timeline() {
    //Constructor

    this._timer = null;
    this._triggers = null;

}

Timeline.prototype = new EventsManager();

/**
 * @documentation: Cette classe est un conteneur et gestionnaire de triggeurs
 *
 */
Timeline.prototype.update = function() {
    //TODO: Implement Me 

};



module.exports = {
    Timeline: Timeline
};
