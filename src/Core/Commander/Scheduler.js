/**
 * Generated On: 2015-10-5
 * Class: Scheduler
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

import PriorityQueue from 'js-priority-queue';
import EventsManager from './Interfaces/EventsManager';

var instanceScheduler = null;

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
            // commands in progress
            executing: 0,
            // commands successfully executed
            executed: 0,
            // commands failed
            failed: 0,
            // commands cancelled
            cancelled: 0,
        },
        execute(cmd, provider, executingCounterUpToDate) {
            if (!executingCounterUpToDate) {
                this.counters.executing++;
            }

            // If the provider returns a Promise, use it to handle counters
            // Otherwise use a resolved Promise.
            var p = provider.executeCommand(cmd) || Promise.resolve();

            return p.then((result) => {
                this.counters.executing--;
                cmd.resolve(result);
                // only count successul commands
                this.counters.executed++;
            }, (err) => {
                this.counters.executing--;
                cmd.reject(err);
                this.counters.failed++;
            });
        },
    };
}

function Scheduler(scene) {
    // Constructor
    if (instanceScheduler !== null) {
        throw new Error('Cannot instantiate more than one Scheduler');
    }

    this.defaultQueue = _instanciateQueue();
    this.hostQueues = new Map();

    this.providers = {};

    this.eventsManager = new EventsManager();
    this.maxConcurrentCommands = 16;
    this.maxCommandsPerHost = 6;

    if (!scene)
        { throw new Error('Cannot instantiate Scheduler without scene'); }

    this.scene = scene;
}

Scheduler.prototype.constructor = Scheduler;

Scheduler.prototype.runCommand = function runCommand(command, queue, executingCounterUpToDate) {
    var provider = this.providers[command.layer.protocol];

    if (!provider) {
        throw new Error('No known provider for layer', command.layer.id);
    }

    queue.execute(command, provider, executingCounterUpToDate).then(() => {
        // notify scene that one command ended.
        // We allow the scene to delay the update/repaint up to 100ms
        // to reduce CPU load (no need to perform an update on completion if we
        // know there's another one ending soon)
        this.scene.notifyChange(100, 'redraw' in command ? command.redraw : true);

        // try to execute next command
        if (queue.counters.executing < this.maxCommandsPerHost) {
            const cmd = this.deQueue(queue);
            if (cmd) {
                return this.runCommand(cmd, queue);
            }
        }
    });
};

Scheduler.prototype.execute = function execute(command, forceRunNow) {
    // parse host
    const layer = command.layer;

    const host = layer.url ? new URL(layer.url).host : undefined;

    command.promise = new Promise((resolve, reject) => {
        command.resolve = resolve;
        command.reject = reject;
    });

    // init queue if needed
    if (host && !(this.hostQueues.has(host))) {
        this.hostQueues.set(host, _instanciateQueue());
    }

    const q = host ? this.hostQueues.get(host) : this.defaultQueue;

    // execute command now if possible
    if (forceRunNow) {
        q.counters.executing++;
        this.runCommand(command, q, true);
    } else if (q.counters.executing < this.maxCommandsPerHost) {
        // increment before
        q.counters.executing++;

        var runNow = function runNow() {
            this.runCommand(command, q, true);
        }.bind(this);

        // We use a setTimeout to defer processing but we avoid the
        // queue mechanism (why setTimeout and not Promise? see tasks vs microtasks priorities)
        window.setTimeout(runNow, 0);
    } else {
        command.timestamp = Date.now();
        q.storage.queue(command);
    }

    return command.promise;
};


Scheduler.prototype.addProtocolProvider = function addProtocolProvider(protocol, provider) {
    this.providers[protocol] = provider;
};

Scheduler.prototype.getProtocolProvider = function getProtocolProvider(protocol) {
    return this.providers[protocol];
};

Scheduler.prototype.commandsWaitingExecutionCount = function commandsWaitingExecutionCount() {
    let sum = this.defaultQueue.storage.length + this.defaultQueue.counters.executing;
    for (var q of this.hostQueues) {
        sum += q[1].storage.length + q[1].counters.executing;
    }
    return sum;
};

Scheduler.prototype.commandsRunningCount = function commandsRunningCount() {
    let sum = this.defaultQueue.counters.executing;

    for (var q of this.hostQueues) {
        sum += q[1].counters.executing;
    }
    return sum;
};

Scheduler.prototype.resetCommandsCount = function resetCommandsCount(type) {
    let sum = this.defaultQueue.counters[type];
    this.defaultQueue.counters[type] = 0;
    for (var q of this.hostQueues) {
        sum += q[1].counters[type];
        q[1].counters[type] = 0;
    }
    return sum;
};

Scheduler.prototype.getProviders = function getProviders() {
    return this.providers.slice();
};

/**
 * Custom error thrown when cancelling commands. Allows the caller to act differently if needed.
 */
function CancelledCommandException(command) {
    this.command = command;
}

CancelledCommandException.prototype.toString = function toString() {
    return `Cancelled command ${this.command.requester.id}/${this.command.layer.id}`;
};

/**
 */
Scheduler.prototype.deQueue = function deQueue(queue) {
    var st = queue.storage;
    while (st.length > 0) {
        var cmd = st.dequeue();

        if (cmd.earlyDropFunction && cmd.earlyDropFunction(cmd)) {
            queue.counters.cancelled++;
            cmd.reject(new CancelledCommandException(cmd));
        } else {
            return cmd;
        }
    }

    return undefined;
};

/**
 */
Scheduler.prototype.wait = function wait() {
    this.eventsManager.wait();
};

export { CancelledCommandException };

export default function (scene) {
    instanceScheduler = instanceScheduler || new Scheduler(scene);
    return instanceScheduler;
}
