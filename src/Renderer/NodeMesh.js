/**
 * Generated On: 2015-10-5
 * Class: NodeMesh
 * Description: Node + THREE.Mesh. Combine les paramètres d'un Node. NodeMesh peut etre ajouté à la THREE.Scene.
 */


import Node from 'Scene/Node';
import * as THREE from 'three';


const NodeMesh = function NodeMesh() {
    // Constructor

    Node.call(this);
    THREE.Mesh.call(this);

    this.sse = 0.0;
    this.pendingSubdivision = false;
    this.helper = undefined;
};

NodeMesh.prototype = Object.create(THREE.Mesh.prototype);

NodeMesh.prototype.constructor = NodeMesh;

NodeMesh.prototype.enableRTC = function enableRTC() {};

NodeMesh.prototype.showHelper = function showHelper(show) {
    if (this.helper !== undefined)
        { this.helper.visible = show; }
};

NodeMesh.prototype.isVisible = function isVisible() {
    return this.visible;
};

NodeMesh.prototype.setVisibility = function setVisibility(show) {
    this.visible = show;
    this.showHelper(show);

    if (this.content !== null)
        { this.content.visible = show; }
};

NodeMesh.prototype.setDisplayed = function setDisplayed(show) {
    this.material.visible = show;
    if (this.helper !== undefined)
        { this.helper.setMaterialVisibility(show); }

    if (this.content !== null && show)
        { this.content.visible = true; }
};

NodeMesh.prototype.isDisplayed = function isDisplayed() {
    return this.material.visible;
};

Node.extend(NodeMesh);

export default NodeMesh;
