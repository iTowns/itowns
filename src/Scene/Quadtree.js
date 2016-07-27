/**
 * Generated On: 2015-10-5
 * Class: Quadtree
 * Description: Structure de données spatiales possedant jusqu'à 4 Nodes
 */

/**
 *
 * @param {type} Layer
 * @param {type} Quad
 * @returns {Quadtree_L13.Quadtree}
 */
import Layer from 'Scene/Layer';
import InterfaceCommander from 'Core/Commander/InterfaceCommander';
import Quad from 'Core/Geographic/Quad';
import NodeMesh from 'Renderer/NodeMesh';


function commandQueuePriorityFunction(cmd) {
    var node = cmd.requester;

    // We know that 'node' is visible because commands can only be
    // issued for visible nodes.
    //
    // Prioritize subdivision request
    if (cmd.layer instanceof Quadtree) {
        return 10000;
    } else {
        if (!node.loaded) {
            return 1000;
        } else {
            // TODO: this magic value comes from NodeProcess
            if (6.0 < node.sse) {
                return 100;
            } else {
                return 10;
            }
        }
    }
}

function Quadtree(type, schemeTile, link) {
    Layer.call(this);

    this.interCommand = new InterfaceCommander(type, commandQueuePriorityFunction);
    this.link = link;
    this.schemeTile = schemeTile;
    this.tileType = type;
    this.minLevel = 2;
    this.maxLevel = 17;
    var rootNode = new NodeMesh();

    rootNode.frustumCulled = false;
    rootNode.material.visible = false;

    rootNode.link = this.link;

    rootNode.changeState = function() {
        return true;
    };

    this.add(rootNode);
}


Quadtree.prototype = Object.create(Layer.prototype);

Quadtree.prototype.constructor = Quadtree;

Quadtree.prototype.init = function(geometryLayer) {
    var rootNode = this.children[0];

    for (var i = 0; i < this.schemeTile.rootCount(); i++) {
        this.requestNewTile(geometryLayer, this.schemeTile.getRoot(i), rootNode);
    }
}

Quadtree.prototype.northWest = function(node) {
    return node.children[0];
};

Quadtree.prototype.northEast = function(node) {
    return node.children[1];
};

Quadtree.prototype.southWest = function(node) {
    return node.children[2];
};

Quadtree.prototype.southEast = function(node) {
    return node.children[3];
};

Quadtree.prototype.requestNewTile = function(geometryLayer, bbox, parent) {
    var params = {
        layer: geometryLayer,
        bbox: bbox
    };

    this.interCommand.request(params, parent);

};

/**
 * @documentation: returns bounding boxes of a node's quadtree subdivision
 * @param {type} node
 * @returns {Array} an array of four bounding boxex
 */
Quadtree.prototype.subdivideNode = function(node) {
    if (node.pendingSubdivision || node.level > this.maxLevel) {
        return [];
    }

    var quad = new Quad(node.bbox);

    return [quad.northWest, quad.northEast, quad.southWest, quad.southEast];
};

export default Quadtree;
