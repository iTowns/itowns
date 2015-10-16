/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

define('Core/Commander/ManagerCommands',['Core/Commander/Providers/WMTS_Provider','Core/Commander/Interfaces/EventsManager'], function(WMTS_Provider,EventsManager){

    var instanceCommandManager = null;
    
    function ManagerCommands(){
        //Constructor
        if(instanceCommandManager !== null){
            throw new Error("Cannot instantiate more than one ManagerCommands");
        } 
        this.queueAsync = null;
        this.queueSync = null;
        this.loadQueue = null;
        this.providers = [];
        this.history = null;        
        this.providers.push(new WMTS_Provider());
   
        this.eventsManager = new EventsManager();
        
    }

    ManagerCommands.prototype.constructor = ManagerCommands;


    /**
     * 
     * @param {type} coWMTS
     * @returns {ManagerCommands_L7.ManagerCommands.prototype@arr;providers@call;getTile}
     */
    ManagerCommands.prototype.getTile = function(coWMTS){
        //TODO: Implement Me 
        return this.providers[0].getTile(coWMTS.zoom,coWMTS.row,coWMTS.col);
    };

    /**
    */
    ManagerCommands.prototype.sortByPriority = function(){
        //TODO: Implement Me 

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
        this.scene.updateScene3D();
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