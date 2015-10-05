/**
* Generated On: 2015-10-5
* Class: Camera
* Description: La camera scene, interface avec la camera du 3DEngine.
*/

var Node = require('Node');

function Camera(){
    //Constructor

    this._renderCamera = null;

}

Camera.prototype = new Node();

/**
*/
Camera.prototype.getPosition = function(){
    //TODO: Implement Me 

};



module.exports = {Camera:Camera};