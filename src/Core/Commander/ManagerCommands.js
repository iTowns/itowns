/**
 * Generated On: 2015-10-5
 * Class: ManagerCommands
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

/**
 *
 * @param {type} EventsManager
 * @param {type} PriorityQueue
 * @param {type} when
 * @returns {Function}
 */
import EventsManager from 'Core/Commander/Interfaces/EventsManager';
import Globe from 'Globe/Globe';
import TileProvider from 'Core/Commander/Providers/TileProvider';
import PriorityQueue from 'PriorityQueue';
import when from 'when';

var instanceCommandManager = null;

function ManagerCommands(scene) {
    //Constructor
    if (instanceCommandManager !== null) {
        throw new Error("Cannot instantiate more than one ManagerCommands");
    }

    this.queueAsync = new PriorityQueue({
        comparator: function(a, b) {
            return b.priority - a.priority;
        }
    });

    this.queueSync = null;
    this.loadQueue = [];
    this.providerMap = {};
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

ManagerCommands.prototype.addLayer = function(layer, provider) {
    this.providerMap[layer.id] = provider;
};

ManagerCommands.prototype.addMapProvider = function(map) {

    var tileProvider = new TileProvider(map.size, this, map.gLDebug);
    this.addLayer(map.tiles, tileProvider);

};

ManagerCommands.prototype.getProvider = function(layer) {
    return this.providerMap[layer.id];
};

ManagerCommands.prototype.commandsLength = function() {
    return this.queueAsync.length;
};

ManagerCommands.prototype.isFree = function() {
    return this.commandsLength() === 0;
};

ManagerCommands.prototype.runAllCommands = function() {


    if (this.commandsLength() === 0) {
        return when(0);
    }

    return when.all(this.arrayDeQueue(16))
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

            // TEMP

            var providers = this.getProviders(command.layer);
            for (var i = 0; i < providers.length; i++)
                arrayTasks.push(providers[i].executeCommand(command));
        }
    }

    return arrayTasks;
};

ManagerCommands.prototype.getProviders = function(layer) {

    // TEMP
    var providers = [];
    var provider = this.providerMap[layer.id];

    if (!provider) {
        for (var key in layer.children) {
            provider = this.providerMap[layer.children[key].id];

            if (providers.indexOf(provider) < 0)
                providers.push(provider);
        }

    } else
        providers.push(provider);

    return providers;

}


/**
 */
ManagerCommands.prototype.deQueue = function() {

    while (this.queueAsync.length > 0) {
        var com = this.queueAsync.peek();
        var parent = com.requester;

        if (parent.visible === false && parent.level >= 2) {

            while (parent.children.length > 0) {
                var child = parent.children[0];
                child.dispose();
                parent.remove(child);
            }
            parent.pendingSubdivision = false;
            this.queueAsync.dequeue();
        } else
            return this.queueAsync.dequeue();

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
