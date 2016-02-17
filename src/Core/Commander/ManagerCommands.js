/**
 * Generated On: 2015-10-5
 * Class: ManagerCommands
 * Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
 */

/**
 * 
 * @param {type} tileGlobeProvider
 * @param {type} EventsManager
 * @param {type} PriorityQueue
 * @param {type} when
 * @param {type} EllipsoidTileMesh
 * @param {type} CoordCarto
 * @param {type} THREE
 * @returns {Function}
 */
import tileGlobeProvider from 'Core/Commander/Providers/tileGlobeProvider';
import EventsManager from 'Core/Commander/Interfaces/EventsManager';
import PriorityQueue from 'PriorityQueue';
import when from 'when';
import EllipsoidTileMesh from 'Globe/EllipsoidTileMesh';
import CoordCarto from 'Core/Geographic/CoordCarto';
import THREE from 'THREE';

var instanceCommandManager = null;

function ManagerCommands() {
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
    this.providers = [];
    this.history = null;
    this.eventsManager = new EventsManager();
    this.scene = undefined;

}

ManagerCommands.prototype.constructor = ManagerCommands;

ManagerCommands.prototype.addCommand = function(command) {
    this.queueAsync.queue(command);
};

ManagerCommands.prototype.init = function(scene) {
    this.scene = scene;
};

ManagerCommands.prototype.createProvider = function(type, param) {
    if (type === EllipsoidTileMesh) {
        this.providers.push(new tileGlobeProvider(param));
    }
};

ManagerCommands.prototype.runAllCommands = function() {
    if (this.queueAsync.length === 0)
        return when(0);

    return when.all(this.arrayDeQueue(16))
        .then(function() {
            return this.runAllCommands();
        }.bind(this));

};

ManagerCommands.prototype.arrayDeQueue = function(number) {
    var nT = number === undefined ? this.queueAsync.length : number;

    var arrayTasks = [];

    while (this.queueAsync.length > 0 && arrayTasks.length < nT) {
        arrayTasks.push(this.providers[0].get(this.deQueue()));
    }

    return arrayTasks;
};

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
            parent.wait = false;
            parent.false = false;
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
ManagerCommands.prototype.addInHistory = function(object) {
    //TODO: Implement Me 

};

export default function() {
    instanceCommandManager = instanceCommandManager || new ManagerCommands();
    return instanceCommandManager;
};
