/**
* Generated On: 2015-10-5
* Class: InterfaceCommander
* Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
*/

define('Core/Commander/InterfaceCommander',['Core/Commander/ManagerCommands','Core/Commander/Command'], function(ManagerCommands,Command){

    function InterfaceCommander(type){
        //Constructor

        this.managerCommands = ManagerCommands();      
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
    
    InterfaceCommander.prototype.getTile = function(bbox,parent)
    {
       
        var command = new Command();        
        command.type        = this.type;
        command.requester   = parent;        
        command.paramsFunction.push(bbox);
        
        command.priority = parent.sse === undefined ? 0 : Math.floor(parent.sse * 1000) * parent.level;

        this.managerCommands.addCommand(command);


    };
   

    return InterfaceCommander;
    
});