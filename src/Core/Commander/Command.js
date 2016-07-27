/**
 * Generated On: 2015-10-5
 * Class: Command
 * Description: Cette object contient une commande à executer. Elle porte également les buffers résultants.
 */

function Command() {
    //Constructor

    this.name = null;
    this.priority = 0.0; //Math.floor((Math.random()*100));
    this.state = null;
    this.inParallel = null;
    this.inBuffers = null;
    this.outBuffers = null;
    this.paramsFunction = {};
    this.processFunction = null;
    this.earlyDropFunction = null;
    this.async = null;
    this.type = null;
    this.addInHistory = null;
    this.source = null;
    this.requester = null;
    this.provider = null;
}

Command.prototype.constructor = Command;

/**
 */
Command.prototype.instance = function() {
    //TODO: Implement Me

};

export default Command;
