/**
 * Generated On: 2015-10-5
 * Class: InterfaceCommander
 * Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
 */

import ManagerCommands from 'Core/Commander/ManagerCommands';
import Command from 'Core/Commander/Command';

function InterfaceCommander(type, priorityFunction) {
    this.managerCommands = ManagerCommands();
    this.priorityFunction = priorityFunction;
    this.type = type;
}

InterfaceCommander.prototype.constructor = InterfaceCommander;

/**
 * @return  {[object Object]}
 */
InterfaceCommander.prototype.buildCommand = function buildCommand() {
    // TODO: Implement Me
    this._builderCommand();
};

InterfaceCommander.prototype.request = function request(parameters, requester, earlyDropFunction) {
    var command = new Command();
    command.type = this.type;
    command.requester = requester;
    command.paramsFunction = parameters;
    command.layer = parameters.layer;
    command.earlyDropFunction = earlyDropFunction;
    command.timestamp = Date.now();

    command.promise = new Promise((resolve, reject) => {
        command.resolve = resolve;
        command.reject = reject;
    });

    command.priority = this.priorityFunction ? this.priorityFunction(command) : 1;

    this.managerCommands.addCommand(command);

    return command.promise;
};


export default InterfaceCommander;
