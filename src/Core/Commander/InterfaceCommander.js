/**
 * Generated On: 2015-10-5
 * Class: InterfaceCommander
 * Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
 */

import ManagerCommands from 'Core/Commander/ManagerCommands';
import Command from 'Core/Commander/Command';

function InterfaceCommander(type, param) {
    //Constructor

    this.managerCommands = ManagerCommands();
    this.type = type;

    this.managerCommands.createProvider(this.type, param);

}

InterfaceCommander.prototype.constructor = InterfaceCommander;

/**
 * @param com {[object Object]} 
 */
InterfaceCommander.prototype.request = function(com) {
    //TODO: Implement Me 

};

/**
 * @return  {[object Object]} 
 */
InterfaceCommander.prototype.buildCommand = function() {
    //TODO: Implement Me 
    this._builderCommand();
};

InterfaceCommander.prototype.getTextureBil = function(coWMTS) {
    //TODO: Implement Me 
    return this.managerCommands.getTextureBil(coWMTS);
};

InterfaceCommander.prototype.getTextureOrtho = function(coWMTS) {
    //TODO: Implement Me 
    return this.managerCommands.getTextureOrtho(coWMTS);
};

InterfaceCommander.prototype.getTile = function(bbox, parent) {

    var command = new Command();
    command.type = this.type;
    command.requester = parent;
    command.paramsFunction.push(bbox);

    //command.priority = parent.sse === undefined ? 1 : Math.floor(parent.visible ? parent.sse * 10000 : 1.0) *  (parent.visible ? Math.abs(19 - parent.level) : Math.abs(parent.level) ) *10000;

    command.priority = parent.sse === undefined ? 1 : Math.floor(parent.visible && parent.material.visible ? parent.sse * parent.sse * 100000 : 1.0);

    this.managerCommands.addCommand(command);
};


export default InterfaceCommander;
