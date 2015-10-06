/**
* Generated On: 2015-10-5
* Class: NodeMesh
* Description: Node + THREE.Mesh. Combine les paramètres d'un Node. NodeMesh peut etre ajouté à la THREE.Scene.
*/



define('Renderer/NodeMesh',['Scene/Node','THREE'], function(Node, THREE){
  
   
    var  NodeMesh = function (){
        //Constructor

        Node.call( this );
        THREE.Mesh.call( this );
    };

    NodeMesh.prototype = Object.create( THREE.Mesh.prototype );

    NodeMesh.prototype.constructor = NodeMesh;
    
    Node.extend(NodeMesh);
    
    return NodeMesh;
    
});


