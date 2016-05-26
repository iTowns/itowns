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
        this.pendingRequests = {};

    }

    InterfaceCommander.prototype.constructor = InterfaceCommander;

    /**
     * @return  {[object Object]}
     */
    InterfaceCommander.prototype.buildCommand = function() {
        //TODO: Implement Me
        this._builderCommand();
    };

    InterfaceCommander.prototype.request = function(type, requester, layer, parameters) {

        if(type === undefined) return;

        var key = requester.id + "." + type;
        if(this.pendingRequests[key] !== undefined) return;

        var command = new Command();
        command.type = type;
        command.requester = requester;
        command.parameters = parameters;
        command.layer = layer;

        var that = this;
        command.callback = function() {
            if(parameters.callback) {
                parameters.callback();
            }
            that.pendingRequests[key] = undefined;
        };

        this.pendingRequests[key] = command;

        //command.priority = parent.sse === undefined ? 1 : Math.floor(parent.visible ? parent.sse * 10000 : 1.0) *  (parent.visible ? Math.abs(19 - parent.level) : Math.abs(parent.level) ) *10000;

        command.priority = requester.sse ? Math.floor(requester.visible && requester.material.visible ? requester.sse * requester.sse * 100000 : 1.0) : 1.0;

        this.managerCommands.addCommand(command);
    };


    return InterfaceCommander;

});
