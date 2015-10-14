/**
* Generated On: 2015-10-5
* Class: InterfaceCommander
* Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
*/

define('Core/Commander/InterfaceCommander',['Core/Commander/ManagerCommands'], function(ManagerCommands){

    function InterfaceCommander(managerCom,buildCommand){
        //Constructor

        this.managerCommands = ManagerCommands();
        this.builderCommand  = buildCommand;

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
    
    InterfaceCommander.prototype.getTile = function(zoom,x,y){
        //TODO: Implement Me 
        return this.managerCommands.getTile(zoom,x,y);
    };

    return InterfaceCommander;
    
});