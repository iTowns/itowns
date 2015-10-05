/**
* Generated On: 2015-10-5
* Class: NodeMesh
* Description: Node + THREE.Mesh. Combine les paramètres d'un Node. NodeMesh peut etre ajouté à la THREE.Scene.
*/

var Node = require('Node');

var Mesh = require('Mesh');

function NodeMesh(){
    //Constructor


}

NodeMesh.prototype = new Node();
NodeMesh.prototype = new Mesh();


module.exports = {NodeMesh:NodeMesh};