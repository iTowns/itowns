/**
 * Generated On: 2015-10-5
 * Class: InterfaceCommander
 * Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
 */

define('Core/Commander/InterfaceCommander', ['Core/Commander/ManagerCommands', 'Core/Commander/Command'], function(ManagerCommands, Command) {

    function InterfaceCommander(type) {
        //Constructor

        this.managerCommands = ManagerCommands();
        this.type = type;
  
    }

    InterfaceCommander.prototype.constructor = InterfaceCommander;

    /**
     * @param com {[object Object]} 
     */
    InterfaceCommander.prototype.request = function(/*com*/) {
        //TODO: Implement Me 

    };

    /**
     * @return  {[object Object]} 
     */
    InterfaceCommander.prototype.buildCommand = function() {
        //TODO: Implement Me 
        this._builderCommand();
    };

    InterfaceCommander.prototype.request = function(parameters, requester, layer) {

        var command = new Command();
        command.type = this.type;
        command.requester = requester;
        command.paramsFunction = parameters;
        command.layer = layer;

        //command.priority = parent.sse === undefined ? 1 : Math.floor(parent.visible ? parent.sse * 10000 : 1.0) *  (parent.visible ? Math.abs(19 - parent.level) : Math.abs(parent.level) ) *10000;

        command.priority = requester.sse ? Math.floor(requester.visible && requester.material.visible ? requester.sse * requester.sse * 100000 : 1.0) : 1.0;

        this.managerCommands.addCommand(command);
    };    


    return InterfaceCommander;

});
