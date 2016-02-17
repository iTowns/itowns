/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */


import EventsManager from 'Core/Commander/Interfaces/EventsManager';
import Scene from 'Scene/Scene';

function ApiGlobe() {
    //Constructor

    this.scene = null;
    this.commandsTree = null;

};

ApiGlobe.prototype = new EventsManager();

/**
 * @param Command
 */
ApiGlobe.prototype.add = function(Command) {
    //TODO: Implement Me 

};


/**
 * @param commandTemplate
 */
ApiGlobe.prototype.createCommand = function(commandTemplate) {
    //TODO: Implement Me 

};

/**
 */
ApiGlobe.prototype.execute = function() {
    //TODO: Implement Me 

};

ApiGlobe.createSceneGlobe = function(pos) {
    //TODO: Normalement la creation de scene ne doit pas etre ici....
    // A  deplacer plus tard

    this.scene = Scene();
    this.scene.init(pos);

    return this.scene;

};

ApiGlobe.showClouds = function(value) {

    this.scene.layers[0].showClouds(value);
};

export default ApiGlobe;
