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
define('Core/Commander/ManagerCommands', [
        'Core/Commander/Interfaces/EventsManager',
        'Globe/Globe',
        'Core/Commander/Providers/TileProvider',
        'PriorityQueue',
        'when'
    ],
    function(
        EventsManager,
        Globe,
        TileProvider,
        PriorityQueue,
        when
    ) {

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

            if(!scene)
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

            var tileProvider = new TileProvider(map.size,map.gLDebug);
            this.addLayer(map.tiles,tileProvider);

        };

        ManagerCommands.prototype.getProvider = function(layer) {
            return this.providerMap[layer.id];
        };

        ManagerCommands.prototype.commandsLength = function() {
            return this.queueAsync.length;
        };

        ManagerCommands.prototype.isFree = function() {
            return this.commandsLength()===0;
        };

        ManagerCommands.prototype.runAllCommands = function() {


            if (this.commandsLength() === 0)
            {
                return when(0);
            }

            return when.all(this.arrayDeQueue(16))
                .then(function() {

                // if (this.commandsLength() <= 8)
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
                if(command)
                    arrayTasks.push(this.providerMap[command.layer.id].executeCommand(command));
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
        ManagerCommands.prototype.addInHistory = function(/*object*/) {
            //TODO: Implement Me

        };

        return function(scene) {
            instanceCommandManager = instanceCommandManager || new ManagerCommands(scene);
            return instanceCommandManager;
        };

    });
