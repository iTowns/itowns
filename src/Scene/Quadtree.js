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
define('Scene/Quadtree', [
    'Scene/Layer',
    'Core/Geographic/Quad',
    'Renderer/NodeMesh'
], function(Layer, Quad, NodeMesh) {


    function Quadtree(type, schemeTile, size, link) {
        Layer.call(this, type, size);


        this.link = link;
        this.schemeTile = schemeTile;
        this.tileType = type;
        this.minLevel = 2;
        this.maxLevel = 17;
        var rootNode = new NodeMesh();

        rootNode.material.visible = false;

        rootNode.link = this.link;

        rootNode.enablePickingRender = function() { return true;};
        this.add(rootNode);
        rootNode.level = -1;    // TODO: change?

        // TEMP
        this.colorLayerId = 'IGNPO';
        this.elevationLayerId = ['IGN_MNT','IGN_MNT_HIGHRES'];

        for (var i = 0; i < this.schemeTile.rootCount(); i++) {
            this.createTile(this.schemeTile.getRoot(i), rootNode);
        }
    }

    Quadtree.prototype = Object.create(Layer.prototype);

    Quadtree.prototype.constructor = Quadtree;

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

    Quadtree.prototype.createTile = function(bbox, parent) {

        var params = {bbox: bbox, level: parent.level + 1, colorLayerId : this.colorLayerId, elevationLayerId : this.elevationLayerId };

        var tile = new this.tileType(params);
        parent.add(tile);

    };

    /**
     * @documentation: subdivide node if necessary
     * @param {type} node
     * @returns {Array} four bounding box
     */
    Quadtree.prototype.subdivide = function(node) {

        node.divided = true;
        if(node.level >= this.maxLevel) return;

        var quad = new Quad(node.bbox);
        this.createTile(quad.northWest, node);
        this.createTile(quad.northEast, node);
        this.createTile(quad.southWest, node);
        this.createTile(quad.southEast, node);

    };

    return Quadtree;

});
