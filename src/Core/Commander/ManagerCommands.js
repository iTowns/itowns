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
            comparator(a, b) {
                var cmp = b.priority - a.priority;
                // Prioritize recent commands
                if (cmp === 0) {
                    return b.timestamp - a.timestamp;
                }
                return cmp;
            },
        }),
        counters: {
            executing: 0,
            executed: 0,
            failed: 0,
            cancelled: 0,
        },
        execute(cmd, provider, executingCounterUpToDate) {
            if (!executingCounterUpToDate) {
                this.counters.executing++;
            }

            // If the provider returns a Promise, use it to handle counters
            // Otherwise use a resolved Promise.
            var p = provider.executeCommand(cmd) || Promise.resolve();

            return p.then(() => {
                this.counters.executing--;
                this.counters.executed++;
            },
                        () => {
                            this.counters.executing--;
                            this.counters.executed++;
                            this.counters.failed++;
                        });
        },
    };
}

function ManagerCommands(scene) {
    // Constructor
    if (instanceCommandManager !== null) {
        throw new Error('Cannot instantiate more than one ManagerCommands');
    }

    this.defaultQueue = _instanciateQueue();
    this.hostQueues = new Map();

    this.providers = {};

    this.eventsManager = new EventsManager();
    this.maxConcurrentCommands = 16;
    this.maxCommandsPerHost = 6;

    if (!scene)
        { throw new Error('Cannot instantiate ManagerCommands without scene'); }

    this.scene = scene;
}

ManagerCommands.prototype.constructor = ManagerCommands;

ManagerCommands.prototype.runCommand = function (command, queue, executingCounterUpToDate) {
    var provider = this.providers[command.layer.protocol];

    if (!provider) {
        throw new Error('No known provider for layer', command.layer.id);
    }

    queue.execute(command, provider, executingCounterUpToDate).then(() => {
        // notify scene that one command ended.
        // We allow the scene to delay the update/repaint up to 100ms
        // to reduce CPU load (no need to perform an update on completion if we
        // know there's another one ending soon)
        this.scene.notifyChange(100);

        // try to execute next command
        if (queue.counters.executing < this.maxCommandsPerHost) {
            const cmd = this.deQueue(queue);
            if (cmd) {
                return this.runCommand(cmd, queue);
            }
        }
    });
};

ManagerCommands.prototype.addCommand = function (command) {
    // parse host
    const layer = command.layer;

    const host = layer.url ? new URL(layer.url).host : undefined;

    // init queue if needed
    if (host && !(this.hostQueues.has(host))) {
        this.hostQueues.set(host, _instanciateQueue());
    }

    const q = host ? this.hostQueues.get(host) : this.defaultQueue;

    // execute command now if possible
    if (q.counters.executing < this.maxCommandsPerHost) {
        // increment before
        q.counters.executing++;

        var runNow = function () {
            this.runCommand(command, q, true);
        }.bind(this);

        // We use a setTimeout to defer processing but we avoid the
        // queue mechanism
        // TODO: Why not use Promise?
        window.setTimeout(runNow, 0);
    } else {
        q.storage.queue(command);
    }
};


ManagerCommands.prototype.addProtocolProvider = function (protocol, provider) {
    this.providers[protocol] = provider;
};

ManagerCommands.prototype.getProtocolProvider = function (protocol) {
    return this.providers[protocol];
};

ManagerCommands.prototype.commandsWaitingExecutionCount = function () {
    let sum = this.defaultQueue.storage.length + this.defaultQueue.counters.executing;
    for (var q of this.hostQueues) {
        sum += q[1].storage.length + q[1].counters.executing;
    }
    return sum;
};

ManagerCommands.prototype.commandsRunningCount = function () {
    let sum = this.defaultQueue.counters.executing;

    for (var q of this.hostQueues) {
        sum += q[1].counters.executing;
    }
    return sum;
};

ManagerCommands.prototype.resetCommandsCount = function (type) {
    let sum = this.defaultQueue.counters[type];
    this.defaultQueue.counters[type] = 0;
    for (var q of this.hostQueues) {
        sum += q[1].counters[type];
        q[1].counters[type] = 0;
    }
    return sum;
};

ManagerCommands.prototype.getProviders = function () {
    var p = [];

    for (var protocol in this.providers) {
        p.push(this.providers[protocol]);
    }
    return p;
};

/**
 */
ManagerCommands.prototype.deQueue = function (queue) {
    var st = queue.storage;
    while (st.length > 0) {
        var cmd = st.dequeue();

        if (cmd.earlyDropFunction && cmd.earlyDropFunction(cmd)) {
            queue.counters.cancelled++;
            cmd.reject(new Error(`command canceled ${cmd.requester.id}/${cmd.layer.id}`));
        } else {
            return cmd;
        }
    }

    return undefined;
};

/**
 */
ManagerCommands.prototype.wait = function () {
    this.eventsManager.wait();
};


export default function (scene) {
    instanceCommandManager = instanceCommandManager || new ManagerCommands(scene);
    return instanceCommandManager;
}
