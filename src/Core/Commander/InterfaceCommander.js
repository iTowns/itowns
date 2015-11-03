/**
* Generated On: 2015-10-5
* Class: InterfaceCommander
* Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
*/

define('Core/Commander/InterfaceCommander',['Core/Commander/ManagerCommands'], function(ManagerCommands){

    function InterfaceCommander(type){
        //Constructor

        this.managerCommands = ManagerCommands();
        //this.builderCommand  = buildCommand;
        
        this.type     = type;

    }

    InterfaceCommander.prototype.constructor = InterfaceCommander;

    /**
    * @param com {[object Object]} 
    */
    InterfaceCommander.prototype.request = function(com){
        //TODO: Implement Me 

    };
 
    /**
    * @return  {[object Object]} 
    */
    InterfaceCommander.prototype.buildCommand = function(){
        //TODO: Implement Me 
        this._builderCommand();
    };
    
    InterfaceCommander.prototype.getTextureBil = function(coWMTS){
        //TODO: Implement Me 
        return this.managerCommands.getTextureBil(coWMTS);
    };
    
    InterfaceCommander.prototype.getTextureOrtho = function(coWMTS){
        //TODO: Implement Me 
        return this.managerCommands.getTextureOrtho(coWMTS);
    };
    
    InterfaceCommander.prototype.getTile = function(bbox,level)
    {
        return this.managerCommands.getTile(type,bbox,level);
    };
    

    return InterfaceCommander;
    
});