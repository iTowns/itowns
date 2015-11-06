/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

/**
 * 
 * @param {type} WMTS_Provider
 * @param {type} EventsManager
 * @param {type} Queue
 * @returns {Function}
 */
define('Core/Commander/ManagerCommands',
        [   'Core/Commander/Providers/WMTS_Provider',
            'Core/Commander/Interfaces/EventsManager',
            'Core/Commander/Queue'], 
        function(
                WMTS_Provider,
                EventsManager,
                Queue){

    var instanceCommandManager = null;
    
    var command  = function(pro)
    {
        this.priority = pro;        
    };
    
    function ManagerCommands(){
        //Constructor
        if(instanceCommandManager !== null){
            throw new Error("Cannot instantiate more than one ManagerCommands");
        } 
        this.queueAsync = new Queue('priority',1);
        this.queueSync  = null;
        this.loadQueue  = null;
        this.providers  = [];
        this.history    = null;        
        this.providers.push(new WMTS_Provider());        
        this.countRequest  = 0;   
        this.eventsManager = new EventsManager();
        
        this.scene         = undefined;
        
    }        

    ManagerCommands.prototype.constructor = ManagerCommands;

    ManagerCommands.prototype.requestInc = function()
    {
      
        this.countRequest++;
        
    };
    
    ManagerCommands.prototype.requestDec = function()
    {
      
        this.countRequest--;
        
        if(this.countRequest === 0)                    
            this.scene.gfxEngine.update();
        
        
    };

    /**
     * 
     * @param {type} coWMTS
     * @returns {ManagerCommands_L7.ManagerCommands.prototype@arr;providers@call;getTile}
     */
    ManagerCommands.prototype.getTextureBil = function(coWMTS){
        
        //var co = new command(Math.floor((Math.random()*100)));        
        //this.queueAsync.insert(co);
        
        this.requestInc();
        
        return this.providers[0].getTextureBil(coWMTS);
    };
    
    ManagerCommands.prototype.getTextureOrtho = function(coWMTS){
                        
        this.requestInc();
        
        return this.providers[0].getTextureOrtho(coWMTS);
    };
    
    ManagerCommands.prototype.getTile = function(bbox,level)
    {
        //return this.getTile(type,bbox,level);
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