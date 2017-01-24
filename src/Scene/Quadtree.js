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
import Layer from './Layer';
import Scheduler from '../Core/Commander/Scheduler';
import NodeMesh from '../Renderer/NodeMesh';
import BoundingBox from './BoundingBox';

function Quadtree(type, schemeTile, link) {
    Layer.call(this);

    this.type = type;
    this.scheduler = Scheduler();
    this.link = link;
    this.schemeTile = schemeTile;
    this.tileType = type;
    this.minLevel = 2;
    this.maxLevel = 17;
    var rootNode = new NodeMesh();

    rootNode.frustumCulled = false;
    rootNode.material.visible = false;

    rootNode.link = this.link;

    rootNode.changeState = function changeState() {
        return true;
    };

    this.add(rootNode);
}

Quadtree.prototype = Object.create(Layer.prototype);

Quadtree.prototype.constructor = Quadtree;

Quadtree.prototype.init = function init(geometryLayer) {
    var rootNode = this.children[0];
    const promises = [];

    for (var i = 0; i < this.schemeTile.rootCount(); i++) {
        promises.push(this.requestNewTile(geometryLayer, this.schemeTile.getRoot(i), rootNode));
    }
    return Promise.all(promises);
};

Quadtree.prototype.northWest = function northWest(node) {
    return node.children[0];
};

Quadtree.prototype.northEast = function northEast(node) {
    return node.children[1];
};

Quadtree.prototype.southWest = function southWest(node) {
    return node.children[2];
};

Quadtree.prototype.southEast = function southEast(node) {
    return node.children[3];
};

Quadtree.prototype.requestNewTile = function requestNewTile(geometryLayer, bbox, parent) {
    const command = {
        /* mandatory */
        requester: parent,
        layer: geometryLayer,
        priority: 10000,
        /* specific params */
        bbox,
        type: this.type,
        level: 0,
    };

    return this.scheduler.execute(command);
};

Quadtree.prototype.canSubdivideNode = function canSubdivideNode(node) {
    return node.level < this.maxLevel;
};

/**
 * @documentation: returns bounding boxes of a node's quadtree subdivision
 * @param {type} node
 * @returns {Array} an array of four bounding boxex
 */
Quadtree.prototype.subdivideNode = function subdivideNode(node) {
    if (node.pendingSubdivision || !this.canSubdivideNode(node)) {
        return [];
    }

    const bbox = node.bbox;
    const center = bbox.center();

    const northWest = new BoundingBox(bbox.crs(), bbox.west(), center._values[0], center._values[1], bbox.north());
    const northEast = new BoundingBox(bbox.crs(), center._values[0], bbox.east(), center._values[1], bbox.north());
    const southWest = new BoundingBox(bbox.crs(), bbox.west(), center._values[0], bbox.south(), center._values[1]);
    const southEast = new BoundingBox(bbox.crs(), center._values[0], bbox.east(), bbox.south(), center._values[1]);

    // scheme tiles store their coordinates in radians internally,
    // so we need to fix the new bboxes as well
    const result = [northWest, northEast, southWest, southEast];

    for (const bbox of result) {
        bbox.minCoordinate._internalStorageUnit = node.bbox.minCoordinate._internalStorageUnit;
        bbox.maxCoordinate._internalStorageUnit = node.bbox.minCoordinate._internalStorageUnit;
    }
    return result;
};

Quadtree.prototype.traverse = function traverse(foo, node)
{
    if (foo(node))
      { for (var i = 0; i < node.children.length; i++)
        { this.traverse(foo, node.children[i]); } }
};

Quadtree.prototype.getTile = function getTile(coordinate) {
    var point = { x: coordinate.longitude(), y: coordinate.latitude() };

    var gT = function gT(tile)
    {
        var inside = tile.bbox ? tile.bbox.isInside(point) : true;

        if (tile.children.length === 0 && inside)
            { point.tile = tile; }

        // TODO: Fix error verify if this is correct
        if (inside)
             { point.parent = tile.parent; }

        return inside;
    };

    this.traverse(gT, this.children[0]);

    if (point.tile === undefined)
      { return point.parent; }
    else
      { return point.tile; }
};

export default Quadtree;
