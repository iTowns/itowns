/**
 * Generated On: 2015-10-5
 * Class: InterfaceCommander
 * Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
 */

define('Core/Commander/InterfaceCommander', ['Core/Commander/ManagerCommands', 'Core/Commander/Command', 'when'], function(ManagerCommands, Command, when) {

    function InterfaceCommander(type) {
        //Constructor

        this.managerCommands = ManagerCommands();
        this.type = type;

    }

    InterfaceCommander.prototype.constructor = InterfaceCommander;

    /**
     * @return  {[object Object]}
     */
    InterfaceCommander.prototype.buildCommand = function() {
        //TODO: Implement Me
        this._builderCommand();
    };

    InterfaceCommander.prototype.request = function(parameters, requester, earlyDropFunction) {

        var command = new Command();
        command.type = this.type;
        command.requester = requester;
        command.paramsFunction = parameters;
        command.layer = parameters.layer;
        command.earlyDropFunction = earlyDropFunction;

        command.promise = new when.promise(function(resolve, reject) {
            command.resolve = resolve;
            command.reject = reject;
        });

        //command.priority = parent.sse === undefined ? 1 : Math.floor(parent.visible ? parent.sse * 10000 : 1.0) *  (parent.visible ? Math.abs(19 - parent.level) : Math.abs(parent.level) ) *10000;

        command.priority = requester.sse ? Math.floor(requester.isVisible() && requester.isDisplayed() ? requester.sse * requester.sse * 100000 : 1.0) : 1.0;

        this.managerCommands.addCommand(command);

        return command.promise;
    };


    return InterfaceCommander;

});
