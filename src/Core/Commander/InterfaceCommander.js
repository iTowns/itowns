/**
* Generated On: 2015-10-5
* Class: InterfaceCommander
* Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
*/

define('Core/Commander/InterfaceCommander',['Core/Commander/ManagerCommands','Core/Commander/Command'], function(ManagerCommands,Command){

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
    
    InterfaceCommander.prototype.getTile = function(bbox,cooWMTS,parent)
    {
        //console.log(this.type);
        
        var command = new Command();        
        command.type        = this.type;
        command.requester   = parent;        
        command.paramsFunction.push(bbox);
        command.paramsFunction.push(cooWMTS);        
        this.managerCommands.addCommand(command);
        
        //console.log("Command " +  cooWMTS.zoom + " " +   cooWMTS.row + " " + cooWMTS.col );
        //return this.managerCommands.getTile(type,bbox,level);
    };
    
    
    InterfaceCommander.prototype.requestDec = function()
    {
      
        this.managerCommands.requestDec();
        
        //console.log(this.managerCommands.countRequest);
        
    };
    

    return InterfaceCommander;
    
});