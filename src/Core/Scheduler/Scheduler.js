/**
 * Generated On: 2015-10-5
 * Class: Scheduler
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

import PriorityQueue from 'js-priority-queue';
import WMTS_Provider from './Providers/WMTS_Provider';
import WMS_Provider from './Providers/WMS_Provider';
import TileProvider from './Providers/TileProvider';
import $3dTiles_Provider from './Providers/3dTiles_Provider';
import TMS_Provider from './Providers/TMS_Provider';
import PointCloudProvider from './Providers/PointCloudProvider';
import WFS_Provider from './Providers/WFS_Provider';
import Raster_Provider from './Providers/Raster_Provider';

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
                if (__DEBUG__) {
                    // eslint-disable-next-line no-console
                    console.error(err);
                }
            });
        },
    };
}

function Scheduler() {
    // Constructor
    if (instanceScheduler !== null) {
        throw new Error('Cannot instantiate more than one Scheduler');
    }

    this.defaultQueue = _instanciateQueue();
    this.hostQueues = new Map();

    this.providers = {};

    this.maxConcurrentCommands = 16;
    this.maxCommandsPerHost = 6;

    // TODO: add an options to not instanciate default providers
    this.initDefaultProviders();
}

Scheduler.prototype.constructor = Scheduler;

Scheduler.prototype.initDefaultProviders = function initDefaultProviders() {
    // Register all providers
    var wmtsProvider = new WMTS_Provider();
    this.addProtocolProvider('wmts', wmtsProvider);
    this.addProtocolProvider('wmtsc', wmtsProvider);
    this.addProtocolProvider('tile', new TileProvider());
    this.addProtocolProvider('wms', new WMS_Provider());
    this.addProtocolProvider('3d-tiles', new $3dTiles_Provider());
    this.addProtocolProvider('tms', new TMS_Provider());
    this.addProtocolProvider('potreeconverter', PointCloudProvider);
    this.addProtocolProvider('wfs', new WFS_Provider());
    this.addProtocolProvider('rasterizer', Raster_Provider);
};

Scheduler.prototype.runCommand = function runCommand(command, queue, executingCounterUpToDate) {
    var provider = this.providers[command.layer.protocol];

    if (!provider) {
        throw new Error('No known provider for layer', command.layer.id);
    }

    queue.execute(command, provider, executingCounterUpToDate).then(() => {
        // notify view that one command ended.
        command.view.notifyChange('redraw' in command ? command.redraw : true, command.requester);

        // try to execute next command
        if (queue.counters.executing < this.maxCommandsPerHost) {
            const cmd = this.deQueue(queue);
            if (cmd) {
                return this.runCommand(cmd, queue);
            }
        }
    });
};

Scheduler.prototype.execute = function execute(command) {
    // TODO: check for mandatory commands fields


    // parse host
    const layer = command.layer;
    const host = layer.url ? new URL(layer.url, document.location).host : undefined;

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
    if (q.counters.executing < this.maxCommandsPerHost) {
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
 * @constructor
 * @param {Command} command
 */
function CancelledCommandException(command) {
    this.command = command;
}

CancelledCommandException.prototype.toString = function toString() {
    return `Cancelled command ${this.command.requester.id}/${this.command.layer.id}`;
};

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

export { CancelledCommandException };
export default Scheduler;
