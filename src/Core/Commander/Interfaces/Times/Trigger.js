/**
 * Generated On: 2015-10-5
 * Class: Trigger
 * Description: Cette classe est déclanche une commande à la fin d'un compte à rebours
 */

function Trigger() {
    //Constructor

    this._trigTime = null;
    this._command = null;
    this.children = null;

}


/**
 */
Trigger.prototype.executeChildrenCommand = function() {
    //TODO: Implement Me

};



export {
    Trigger
};
