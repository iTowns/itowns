/**
 * Generated On: 2015-10-5
 * Class: Scheduler
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

import PriorityQueue from 'js-priority-queue';
import WMTSProvider from '../../Provider/WMTSProvider';
import WMSProvider from '../../Provider/WMSProvider';
import TileProvider from '../../Provider/TileProvider';
import $3dTilesProvider from '../../Provider/3dTilesProvider';
import TMSProvider from '../../Provider/TMSProvider';
import PointCloudProvider from '../../Provider/PointCloudProvider';
import WFSProvider from '../../Provider/WFSProvider';
import RasterProvider from '../../Provider/RasterProvider';
import StaticProvider from '../../Provider/StaticProvider';
import CancelledCommandException from './CancelledCommandException';

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

            return provider.executeCommand(cmd).then((result) => {
                this.counters.executing--;
                cmd.resolve(result);
                // only count successul commands
                this.counters.executed++;
            }, (err) => {
                this.counters.executing--;
                cmd.reject(err);
                this.counters.failed++;
                if (__DEBUG__ && this.counters.failed < 3) {
                    console.error(err);
                }
            });
        },
    };
}

/**
 * The Scheduler is in charge of managing the [Providers]{@link Provider} that
 * are used to gather resources needed to display the layers on a {@link View}.
 * There is only one instance of a Scheduler per webview, and it is instanciated
 * with the creation of the first view.
 *
 * @constructor
 */
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
    this.addProtocolProvider('wmts', WMTSProvider);
    this.addProtocolProvider('wmtsc', WMTSProvider);
    this.addProtocolProvider('tile', TileProvider);
    this.addProtocolProvider('wms', WMSProvider);
    this.addProtocolProvider('3d-tiles', $3dTilesProvider);
    this.addProtocolProvider('tms', TMSProvider);
    this.addProtocolProvider('xyz', TMSProvider);
    this.addProtocolProvider('potreeconverter', PointCloudProvider);
    this.addProtocolProvider('wfs', WFSProvider);
    this.addProtocolProvider('rasterizer', RasterProvider);
    this.addProtocolProvider('static', StaticProvider);
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

        // We use a setTimeout to defer processing but we avoid the
        // queue mechanism (why setTimeout and not Promise? see tasks vs microtasks priorities)
        window.setTimeout(() => {
            this.runCommand(command, q, true);
        }, 0);
    } else {
        command.timestamp = Date.now();
        q.storage.queue(command);
    }

    return command.promise;
};

/**
 * A Provider has the responsability to handle protocols and datablobs. Given a
 * data request (see {@link Provider#executeCommand} for details about this
 * request), it fetches serialized datasets, file content or even file chunks.
 *
 * @interface Provider
 */

/**
 * When adding a layer to a view, some preprocessing can be done on it, before
 * fetching or creating resources attached to it. For example, in the WMTS and
 * WFS providers (included in iTowns), default options to the layer are added if
 * some are missing.
 *
 * @function
 * @name Provider#preprocessDataLayer
 *
 * @param {Layer} layer
 * @param {View} [view]
 * @param {Scheduler} [scheduler]
 * @param {Layer} [parentLayer]
 */

/**
 * In the {@link Scheduler} loop, this function is called every time the layer
 * needs new information about itself. For tiled layers, it gets the necessary
 * tiles, given the current position of the camera on the map. For simple layers
 * like a GPX trace, it gets the data once.
 * <br><br>
 * It passes a <code>command</code> object as a parameter, with the
 * <code>view</code> and the <code>layer</code> always present. The other
 * parameters are optional.
 *
 * @function
 * @name Provider#executeCommand
 *
 * @param {Object} command
 * @param {View} command.view
 * @param {Layer} command.layer
 * @param {TileMesh} [command.requester] - Every layer is attached to a tile.
 * @param {number} [command.targetLevel] - The target level is used when there
 * is a tiled layer, such as WMTS or TMS, but not in case like a GPX layer.
 *
 * @return {Promise} The {@link Scheduler} always expect a Promise as a result,
 * resolving to an object containing sufficient information for the associated
 * processing to the current layer. For example, see the
 * [LayeredMaterialNodeProcessing#updateLayeredMaterialNodeElevation]{@link
 * https://github.com/iTowns/itowns/blob/master/src/Process/LayeredMaterialNodeProcessing.js}
 * class or other processing class.
 */

/**
 * Adds a provider for a specified protocol. The provider will be used when
 * executing the queue to provide resources. See {@link Provider} for more
 * informations.
 * By default, some protocols are already set in iTowns: WMTS, WMS, WFS, TMS,
 * XYZ, PotreeConverter, Rasterizer, 3D-Tiles and Static.
 * <br><br>
 * Warning: if the specified protocol has already a provider attached to it, the
 * current provider will be overwritten by the given provider.
 *
 * @param {string} protocol - The name of the protocol to add. This is the
 * <code>protocol</code> parameter put inside the configuration when adding a
 * layer. The capitalization of the name is not taken into account here.
 * @param {Provider} provider - The provider to link to the protocol, that must
 * respect the {@link Provider} interface description.
 *
 * @throws {Error} an error if any method of the {@link Provider} is not present
 * in the provider.
 */
Scheduler.prototype.addProtocolProvider = function addProtocolProvider(protocol, provider) {
    if (typeof (provider.executeCommand) !== 'function') {
        throw new Error(`Can't add provider for ${protocol}: missing a executeCommand function.`);
    }
    if (typeof (provider.preprocessDataLayer) !== 'function') {
        throw new Error(`Can't add provider for ${protocol}: missing a preprocessDataLayer function.`);
    }

    this.providers[protocol] = provider;
};

/**
 * Get a specific {@link Provider} given a particular protocol.
 *
 * @param {string} protocol
 *
 * @return {Provider}
 */
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

export default Scheduler;
