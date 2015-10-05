/**
* Generated On: 2015-10-5
* Class: Command
* Description: Cette object contient une commande à executer. Elle porte également les buffers résultants.
*/

function Command(){
    //Constructor

    this.name = null;
    this.property = null;
    this.state = null;
    this.inParallel = null;
    this.inBuffers = null;
    this.outBuffers = null;
    this.paramsFunction = null;
    this.processFunction = null;
    this.async = null;
    this.force = null;
    this.type = null;
    this.addInHistory = null;
    this.source = null;

}


/**
*/
Command.prototype.instance = function(){
    //TODO: Implement Me 

};



module.exports = {Command:Command};