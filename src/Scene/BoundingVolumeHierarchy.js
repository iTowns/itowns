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
import RendererConstant from 'Renderer/RendererConstant'

function commandQueuePriorityFunction(/*cmd*/) {
    return 100000; // TODO: more suitable value
}

function BoundingVolumeHierarchy(type, lvl0Tiles, link) {
    Layer.call(this);

    this.interCommand = new InterfaceCommander(type, commandQueuePriorityFunction);
    this.link = link;
    this.tileType = type;
    var rootNode = new NodeMesh();
    rootNode.childrenBboxes = lvl0Tiles;

    rootNode.frustumCulled = false;
    rootNode.material.visible = false;
    rootNode.changeState = function() {
        return true;
    };

    rootNode.link = this.link;

    this.add(rootNode);
}


BoundingVolumeHierarchy.prototype = Object.create(Layer.prototype);

BoundingVolumeHierarchy.prototype.constructor = BoundingVolumeHierarchy;

BoundingVolumeHierarchy.prototype.init = function(geometryLayer, normalRenderTarget) {
    // TODO: loading level-0 tiles should not be mandatory
    var rootNode = this.children[0];

    for (var i = 0; i < rootNode.childrenBboxes.length; i++) {
        this.requestNewTile(geometryLayer, rootNode.childrenBboxes[i], rootNode, normalRenderTarget);
    }
};

BoundingVolumeHierarchy.prototype.requestNewTile = function(geometryLayer, bbox, parent, normalRenderTarget) {
    var params = {
        layer: geometryLayer,
        bbox: bbox.bbox,
        bboxId: bbox.id
    };

    this.interCommand.request(params, parent).then(function(node) {
        node.materials[RendererConstant.FINAL].uniforms.normalTexture.value = normalRenderTarget.texture;
        node.materials[RendererConstant.FINAL].uniforms.resolution.value =
            [normalRenderTarget.width, normalRenderTarget.height];
    });

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

    return node.childrenBboxes;
};

export default BoundingVolumeHierarchy;
