/**
 * Generated On: 2015-10-5
 * Class: InterfaceCommander
 * Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
 */

define('Core/Commander/InterfaceCommander', ['Core/Commander/ManagerCommands', 'Core/Commander/Command'], function(ManagerCommands, Command) {

    function InterfaceCommander(type, param) {
        //Constructor

        this.managerCommands = ManagerCommands();
        this.type = type;
  
    }

    InterfaceCommander.prototype.constructor = InterfaceCommander;

    /**
     * @param com {[object Object]} 
     */
    InterfaceCommander.prototype.request = function(com) {
        //TODO: Implement Me 

    };

    /**
     * @return  {[object Object]} 
     */
    InterfaceCommander.prototype.buildCommand = function() {
        //TODO: Implement Me 
        this._builderCommand();
    };

    InterfaceCommander.prototype.request = function(parameters, parent, layer) {

        var command = new Command();
        command.type = this.type;
        command.requester = parent;
        command.paramsFunction = parameters;
        command.layer = layer;

        //command.priority = parent.sse === undefined ? 1 : Math.floor(parent.visible ? parent.sse * 10000 : 1.0) *  (parent.visible ? Math.abs(19 - parent.level) : Math.abs(parent.level) ) *10000;

        command.priority = parent.sse ? Math.floor(parent.visible && parent.material.visible ? parent.sse * parent.sse * 100000 : 1.0) : 1.0;

        this.managerCommands.addCommand(command);
    };
    
    
    InterfaceCommander.prototype.requestOrtho = function( node , layer) {

        var command = new Command();
        //command.type = this.type;
        command.requester = node;
        //command.paramsFunction = parameters;
        command.layer = layer; 
        command.priority = node.sse ? Math.floor(node.visible && node.material.visible ? node.sse * node.sse * 100000 : 1.0) : 1.0;

        this.managerCommands.addCommand(command);
    };


    return InterfaceCommander;

});
