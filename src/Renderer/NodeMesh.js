/**
 * Generated On: 2015-10-5
 * Class: NodeMesh
 * Description: Node + THREE.Mesh. Combine les paramètres d'un Node. NodeMesh peut etre ajouté à la THREE.Scene.
 */



import Node from 'Scene/Node';
import THREE from 'THREE';


var NodeMesh = function() {
    //Constructor

    Node.call(this);
    THREE.Mesh.call(this);

    this.sse = 0.0;
    this.wait = false;
    this.helper = undefined;

};

NodeMesh.prototype = Object.create(THREE.Mesh.prototype);

NodeMesh.prototype.constructor = NodeMesh;

NodeMesh.prototype.showHelper = function(show) {
    if (this.helper !== undefined)
        this.helper.visible = show;
};

NodeMesh.prototype.setVisibility = function(show) {
    this.visible = show;
    this.showHelper(show);

    if (this.content !== null)
        this.content.visible = show;

    return show;
};

NodeMesh.prototype.setMaterialVisibility = function(show) {
    this.material.visible = show;
    if (this.helper !== undefined)
        this.helper.setMaterialVisibility(show);

    if (this.content !== null && show)
        this.content.visible = true;

};

NodeMesh.prototype.setChildrenVisibility = function(show) {
    for (var i = 0; i < this.children.length; i++)
        this.children[i].setVisibility(show);
};

Node.extend(NodeMesh);

export default NodeMesh;
