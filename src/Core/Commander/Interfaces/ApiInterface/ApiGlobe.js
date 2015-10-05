/**
* Generated On: 2015-10-5
* Class: ApiGlobe
* Description: Classe façade pour attaquer les fonctionnalités du code.
*/

var EventsManager = require('EventsManager');

function ApiGlobe(){
    //Constructor

    this.commandsTree = null;

}

ApiGlobe.prototype = new EventsManager();

/**
* @param Command
*/
ApiGlobe.prototype.add = function(Command){
    //TODO: Implement Me 

};


/**
* @param command
* @param commandCallBack
*/
ApiGlobe.prototype.connect = function(command, commandCallBack){
    //TODO: Implement Me 

};


/**
* @param commandTemplate
*/
ApiGlobe.prototype.createCommand = function(commandTemplate){
    //TODO: Implement Me 

};


/**
*/
ApiGlobe.prototype.execute = function(){
    //TODO: Implement Me 

};



module.exports = {ApiGlobe:ApiGlobe};