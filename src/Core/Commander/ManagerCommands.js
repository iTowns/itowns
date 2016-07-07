/**
 * Generated On: 2015-10-5
 * Class: ManagerCommands
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

import EventsManager from 'Core/Commander/Interfaces/EventsManager';
import PriorityQueue from 'js-priority-queue';

var instanceCommandManager = null;

function _instanciateQueue() {
    return {
        storage: new PriorityQueue({
            comparator: function(a, b) {
                var cmp = b.priority - a.priority;
                // Prioritize recent commands
                if (cmp === 0) {
                    return b.timestamp - a.timestamp;
                }
                return cmp;
            }
        }),
        counters: {
            executing: 0,
            executed: 0,
            failed: 0,
            cancelled: 0
        },
        execute: function(cmd, provider) {
            this.counters.executing++;

            var p = provider.executeCommand(cmd);

            if (!p) throw new Error('arg');
            return p.then(
                function() {
                    this.counters.executing--;
                    this.counters.executed++;
                }.bind(this),
                function() {
                    this.counters.executing--;
                    this.counters.executed++;
                    this.counters.failed++;
                }.bind(this)
            );
        }
    };
}

function ManagerCommands(scene) {
    //Constructor
    if (instanceCommandManager !== null) {
        throw new Error("Cannot instantiate more than one ManagerCommands");
    }

    this.defaultQueue = _instanciateQueue();
    this.hostQueues = new Map();

    this.providers = {};

    this.eventsManager = new EventsManager();
    this.maxConcurrentCommands = 16;
    this.maxCommandsPerHost = 6;
    this.counters = {
        runningCommands: 0,
        executedCommands: 0,
        hostCommands: {}
    };

    if (!scene)
        throw new Error("Cannot instantiate ManagerCommands without scene");

    this.scene = scene;

}

ManagerCommands.prototype.constructor = ManagerCommands;

ManagerCommands.prototype.runCommand = function(command, queue) {
    var provider = this.providers[command.layer.protocol];

    if (!provider) {
        throw new Error('No known provider for layer', command.layer.id);
    }

    queue.execute(command, provider).then(function() {
        this.scene.notifyChange();

        // try to execute next command
        if (queue.counters.executing < this.maxCommandsPerHost) {
            let cmd = this.deQueue(queue);
            if (cmd) {
                return this.runCommand(cmd, queue);
            }
        }
    }.bind(this));


}

ManagerCommands.prototype.addCommand = function(command) {
    // parse host
    let layer = command.layer;

    let host = layer.url ? new URL(layer.url).host : undefined;

    // init queue if needed
    if (host && !(this.hostQueues.has(host))) {
        this.hostQueues.set(host, _instanciateQueue());
    }

    let q = host ? this.hostQueues.get(host) : this.defaultQueue;

    // execute command now if possible
    if (q.counters.executing < this.maxCommandsPerHost) {
        if (host) {
            this.runCommand(command, q);
        } else {
            Promise.resolve(true).then(function() {
                this.runCommand(command, q);
            }.bind(this));
        }
    } else {
        q.storage.queue(command);
    }
};


ManagerCommands.prototype.addProtocolProvider = function(protocol, provider) {
    this.providers[protocol] = provider;
};

ManagerCommands.prototype.getProtocolProvider = function(protocol) {
    return this.providers[protocol];
};

ManagerCommands.prototype.commandsLength = function() {
    return 0;//return this.queueAsync.length;
};

ManagerCommands.prototype.isFree = function() {
    return this.commandsLength() === 0;
};

ManagerCommands.prototype.resetExecutedCommandsCount = function() {
    this.counters.executedCommands = 0;
};

ManagerCommands.prototype.commandsWaitingExecutionCount = function() {
    let sum = this.defaultQueue.storage.length;

    for (var q of this.hostQueues) {
        sum += q[1].storage.length;
    }
    return sum;
};

ManagerCommands.prototype.commandsRunningCount = function() {
    let sum = this.defaultQueue.counters.executing;

    for (var q of this.hostQueues) {
        sum += q[1].counters.executing;
    }
    return sum;
};

ManagerCommands.prototype.commandsCancelledCount = function() {
    let sum = this.defaultQueue.counters.cancelled;

    for (var q of this.hostQueues) {
        sum += q[1].counters.cancelled;
    }
    return sum;
};


ManagerCommands.prototype.getProviders = function() {
    var p = [];

    for (var protocol in this.providers) {
        p.push(this.providers[protocol]);
    }
    return p;
};



/**
 */
ManagerCommands.prototype.deQueue = function(queue) {
    var st = queue.storage;
    while (st.length > 0) {
        var cmd = st.dequeue();

        if (cmd.earlyDropFunction && cmd.earlyDropFunction(cmd)) {
            queue.counters.cancelled++;
            cmd.reject(new Error('command canceled ' + cmd.requester.id + '/' + cmd.layer.id));
        } else {
            return cmd;
        }

    }

    return undefined;
};

/**
 */
ManagerCommands.prototype.wait = function() {
    this.eventsManager.wait();
};


export default function(scene) {
    instanceCommandManager = instanceCommandManager || new ManagerCommands(scene);
    return instanceCommandManager;
}
