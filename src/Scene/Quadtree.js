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
        
        rootNode.link = this.link;
        
        rootNode.enablePickingRender = function() { return true;};
        this.add(rootNode);

        for (var i = 0; i < this.schemeTile.rootCount(); i++) {
            this.requestNewTile(this.schemeTile.getRoot(i), rootNode);
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

    Quadtree.prototype.requestNewTile = function(bbox, parent) {

        this.interCommand.request({bbox: bbox}, parent, this);

    };

    /**
     * @documentation: subdivise node if necessary
     * @param {type} node
     * @returns {Array} four bounding box
     */
    Quadtree.prototype.up = function(node) {

        if (!this.update(node))
            return;

        node.wait = true;
        var quad = new Quad(node.bbox);
        this.requestNewTile(quad.northWest, node);
        this.requestNewTile(quad.northEast, node);
        this.requestNewTile(quad.southWest, node);
        this.requestNewTile(quad.southEast, node);

    };

    Quadtree.prototype.down = function(node)
    {
        node.setMaterialVisibility(true);        
        node.setChildrenVisibility(false);
    }
    
    Quadtree.prototype.upSubLayer = function(node) {
                
        var id = node.getDownScaledLayer();

        if(id !== undefined)                
        {                        
            this.interCommand.request({subLayer : id}, node, this.children[id+1]);
        }
                    
    };

    /**
     * @documentation: update node 
     * @param {type} node
     * @returns {Boolean}
     */
    Quadtree.prototype.update = function(node) {

        if (node.level > this.maxLevel || node.wait === true)
            return false;

        if (node.childrenCount() > 0 && node.wait === false) {

            node.setMaterialVisibility(!node.childrenLoaded());

            return false;
        }

        return true;
    };

    return Quadtree;

});
