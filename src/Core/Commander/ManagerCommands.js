/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

define('Core/Commander/ManagerCommands',['Core/Commander/Providers/WMTS_Provider'], function(WMTS_Provider){

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
    }

    ManagerCommands.prototype.constructor = ManagerCommands;

    /**
     * 
     * @param {type} zoom
     * @param {type} x
     * @param {type} y
     * @returns {ManagerCommands_L7.ManagerCommands.prototype@arr;providers@call;getTile}
     */
    ManagerCommands.prototype.getTile = function(zoom,x,y){
        //TODO: Implement Me 
        return this.providers[0].getTile(zoom,x,y);
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
    ManagerCommands.prototype.process = function(){
        //TODO: Implement Me 

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