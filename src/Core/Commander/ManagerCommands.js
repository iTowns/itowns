/**
 * Generated On: 2015-10-5
 * Class: ManagerCommands
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

import EventsManager from 'Core/Commander/Interfaces/EventsManager';
import PriorityQueue from 'PriorityQueue';

var instanceCommandManager = null;

function ManagerCommands(scene) {
    //Constructor
    if (instanceCommandManager !== null) {
        throw new Error("Cannot instantiate more than one ManagerCommands");
    }

    this.queueAsync = new PriorityQueue({
        comparator: function(a, b) {
            var cmp = b.priority - a.priority;
            // Prioritize recent commands
            if (cmp === 0) {
                return b.timestamp - a.timestamp;
            }
            return cmp;
        }
    });

    this.queueSync = null;
    this.loadQueue = [];
    this.providers = {};
    this.history = null;
    this.eventsManager = new EventsManager();

    if (!scene)
        throw new Error("Cannot instantiate ManagerCommands without scene");

    this.scene = scene;

}

ManagerCommands.prototype.constructor = ManagerCommands;

ManagerCommands.prototype.addCommand = function(command) {
    this.queueAsync.queue(command);
};


ManagerCommands.prototype.addProtocolProvider = function(protocol, provider) {
    this.providers[protocol] = provider;
};

ManagerCommands.prototype.getProtocolProvider = function(protocol) {
    return this.providers[protocol];
};

ManagerCommands.prototype.commandsLength = function() {
    return this.queueAsync.length;
};

ManagerCommands.prototype.isFree = function() {
    return this.commandsLength() === 0;
};

ManagerCommands.prototype.runAllCommands = function() {


    if (this.commandsLength() === 0) {
        return Promise.resolve(0);
    }

    return Promise.all(this.arrayDeQueue(16))
        .then(function() {
            // if (this.commandsLength() <= 16)
            this.scene.wait(1);
            // else
            //     this.scene.renderScene3D();
            return this.runAllCommands();
        }.bind(this));
};

ManagerCommands.prototype.arrayDeQueue = function(number) {

    var nT = number === undefined ? this.queueAsync.length : number;

    var arrayTasks = [];

    while (this.queueAsync.length > 0 && arrayTasks.length < nT) {
        var command = this.deQueue();

        if (command) {
            var layer = command.layer;
            var provider = this.providers[layer.protocol];
            if (provider) {
                arrayTasks.push(provider.executeCommand(command));
            }
        }
    }

    return arrayTasks;
};

ManagerCommands.prototype.getProviders = function() {
    var p = [];

    for (var protocol in this.providers) {
        p.push(this.providers[protocol]);
    }
    return p;
}


/**
 */
ManagerCommands.prototype.deQueue = function() {

    while (this.queueAsync.length > 0) {
        var cmd = this.queueAsync.peek();

        if (cmd.earlyDropFunction && cmd.earlyDropFunction(cmd)) {
            this.queueAsync.dequeue();
            cmd.reject(new Error('command canceled'));
        } else {
            return this.queueAsync.dequeue();
        }

    }

    return undefined;
};

/**
 */
ManagerCommands.prototype.removeCanceled = function() {
    //TODO: Implement Me

};

/**
 */
ManagerCommands.prototype.wait = function() {
    //TODO: Implement Me
    this.eventsManager.wait();
};

/**
 */
ManagerCommands.prototype.forecast = function() {
    //TODO: Implement Me

};

/**
 * @param object
 */
ManagerCommands.prototype.addInHistory = function( /*object*/ ) {
    //TODO: Implement Me

};

export default function(scene) {
    instanceCommandManager = instanceCommandManager || new ManagerCommands(scene);
    return instanceCommandManager;
}
