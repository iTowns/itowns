/**
 * Class: BoundingVolumeHierarchy
 * Description:
 */

/**
 *
 * @param {type} Layer
 * @param {type} Quad
 * @returns {BoundingVolumeHierarchy_L13.BoundingVolumeHierarchy}
 */
import Layer from 'Scene/Layer';
import InterfaceCommander from 'Core/Commander/InterfaceCommander';
import NodeMesh from 'Renderer/NodeMesh';


function commandQueuePriorityFunction(/*cmd*/) {
    return 100000; // TODO: more suitable value
}

function BoundingVolumeHierarchy(type, lvl0Tiles, tileDictionary, link) {
    Layer.call(this);

    this.interCommand = new InterfaceCommander(type, commandQueuePriorityFunction);
    this.link = link;
    this.tileType = type;
    this.tileDictionary = tileDictionary;
    this.lvl0Tiles = lvl0Tiles;
    var rootNode = new NodeMesh();
    rootNode.childrenBboxes = lvl0Tiles;
    rootNode.maxChildrenNumber = lvl0Tiles.length;

    rootNode.frustumCulled = false;
    rootNode.material.visible = false;

    rootNode.link = this.link;

    rootNode.enablePickingRender = function() {
        return true;
    };
    this.add(rootNode);
}


BoundingVolumeHierarchy.prototype = Object.create(Layer.prototype);

BoundingVolumeHierarchy.prototype.constructor = BoundingVolumeHierarchy;

BoundingVolumeHierarchy.prototype.init = function(geometryLayer) {
    // TODO: loading level-0 tiles should not be mandatory
    var rootNode = this.children[0];

    for (var i = 0; i < this.lvl0Tiles.length; i++) {
        this.requestNewTile(geometryLayer, this.lvl0Tiles[i], rootNode);
    }
};

BoundingVolumeHierarchy.prototype.requestNewTile = function(geometryLayer, bbox, parent) {
    var params = {
        layer: geometryLayer,
        metadata: bbox
    };

    this.interCommand.request(params, parent);

};

BoundingVolumeHierarchy.prototype.canSubdivideNode = function(node) {
    return node.tileId in this.tileDictionary
        && this.tileDictionary[node.tileId].children
        && this.tileDictionary[node.tileId].children.length !== 0;
};

/**
 * @documentation: returns bounding boxes of a node's BoundingVolumeHierarchy subdivision
 * @param {type} node
 * @returns {Array} an array of four bounding boxex
 */
BoundingVolumeHierarchy.prototype.subdivideNode = function(node) {
    if (node.pendingSubdivision) {
        return [];
    }

    return this.tileDictionary[node.tileId].children;
};

BoundingVolumeHierarchy.prototype.traverse = function(foo,node)
{
    if(foo(node))
      for (var i = 0; i < node.children.length; i++)
        this.traverse(foo,node.children[i]);
};

export default BoundingVolumeHierarchy;
