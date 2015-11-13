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
 * @returns {Function}
 */

define('Core/Commander/ManagerCommands',
        [   'Core/Commander/Providers/tileGlobeProvider',
            'Core/Commander/Interfaces/EventsManager',
            'PriorityQueue',
            'when'
        ], 
        function(
                tileGlobeProvider,
                EventsManager,
                PriorityQueue,
                when
        ){

    var instanceCommandManager = null;   
    
    function ManagerCommands(){
        //Constructor
        if(instanceCommandManager !== null){
            throw new Error("Cannot instantiate more than one ManagerCommands");
        } 
        
        this.queueAsync     = new PriorityQueue({ comparator: function(a, b) { return b.priority - a.priority; }});        
        this.queueSync      = null;
        this.loadQueue      = [];
        this.providers      = [];
        this.history        = null;               
        this.providers.push(new tileGlobeProvider());         
        this.eventsManager  = new EventsManager();       
        this.scene          = undefined;
        
    }        

    ManagerCommands.prototype.constructor = ManagerCommands;

    ManagerCommands.prototype.addCommand = function(command)
    {                      
        this.queueAsync.queue(command);
     
        if(this.queueAsync.length > 32 )
        {
            this.runAllCommands();          
        }            
    };
    
    ManagerCommands.prototype.init = function(scene)
    {
        this.scene = scene;        
    };
    
    ManagerCommands.prototype.runAllCommands = function()
    {  
        if(this.queueAsync.length === 0)
        {                       
            return this.process();
        }
        
        return this.providers[0].get(this.queueAsync.dequeue()).then(function()
        {            
            this.runAllCommands();                                                
        }.bind(this));           
               
    };

    /**
    */
    ManagerCommands.prototype.removeCanceled = function(){
        //TODO: Implement Me 

    };
    
    /**
    */
    ManagerCommands.prototype.wait = function(){
        //TODO: Implement Me 
        this.eventsManager.wait();
    };


    /**
    */
    ManagerCommands.prototype.process = function(){
        //TODO: Implement Me 
        if(this.scene !== undefined)
            this.scene.renderScene3D();
    };


    /**
    */
    ManagerCommands.prototype.forecast = function(){
        //TODO: Implement Me 

    };


    /**
    * @param object
    */
    ManagerCommands.prototype.addInHistory = function(object){
        //TODO: Implement Me 

    };

    return function(){
        instanceCommandManager = instanceCommandManager || new ManagerCommands();
        return instanceCommandManager;
    };
    
});