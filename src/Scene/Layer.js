/**
* Generated On: 2015-10-5
* Class: Layer
* Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
* 
*/

var Node = require('Node');

function Layer(){
    //Constructor

    this.interCommand = null;
    this._descriManager = null;

}

Layer.prototype = new Node();


module.exports = {Layer:Layer};