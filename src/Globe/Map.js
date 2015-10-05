/**
* Generated On: 2015-10-5
* Class: Map
* Description: Map est un calque de données cartographique. Il possède un quadtree et un system de projection.
*/

var Layer = require('Layer');

function Map(){
    //Constructor

    this.projection = null;
    this.quatree = null;

}

Map.prototype = new Layer();


module.exports = {Map:Map};