/**
 * Generated On: 2015-10-5
 * Class: History
 * Description: Cette classe est l'historique des états précéddents des objets. Il permet de restituer ces états.
 */

function History() {
    //Constructor

    this.mementos = null;
    this._sizeMax = null;

}


/**
 */
History.prototype.undo = function() {
    //TODO: Implement Me

};


/**
 */
History.prototype.redo = function() {
    //TODO: Implement Me

};


/**
 * @param memento {[object Object]}
 */
History.prototype.add = function(memento) {
    //TODO: Implement Me

};


/**
 * @param id {int}
 */
History.prototype.delete = function(id) {
    //TODO: Implement Me

};



module.exports = {
    History: History
};
