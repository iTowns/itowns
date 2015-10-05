/**
* Generated On: 2015-10-5
* Class: EventsManager
* Description: Cette classe gère les évènements (souris, clavier,réseaux, temporelles, script). Il mets également en place les connections entre les évènements et les commandes.
*/

function EventsManager(){
    //Constructor

    this.commands = null;
    this.events = null;

}


/**
* @param pevent {[object Object]} 
* @param com {[object Object]} 
*/
EventsManager.prototype.connect = function(pevent, com){
    //TODO: Implement Me 

};



module.exports = {EventsManager:EventsManager};