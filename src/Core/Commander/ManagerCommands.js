/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

function ManagerCommands(){
    //Constructor

    this.queueAsync = null;
    this.queueSync = null;
    this.loadQueue = null;
    this._providers = null;
    this._history = null;

}


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



module.exports = {ManagerCommands:ManagerCommands};