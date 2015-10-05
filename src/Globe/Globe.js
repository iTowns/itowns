/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

var Node = require('Node');

function Globe(){
    //Constructor

    this.layers = null;

}

Globe.prototype = new Node();

/**
* @documentation: Gère les interactions entre les QuadTree.
*
*/
Globe.prototype.QuadTreeToMesh = function(){
    //TODO: Implement Me 

};


/**
* @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
*
*/
Globe.prototype.QuadTreeToMaterial = function(){
    //TODO: Implement Me 

};



module.exports = {Globe:Globe};