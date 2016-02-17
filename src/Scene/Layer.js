/**
 * Generated On: 2015-10-5
 * Class: Layer
 * Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
 * 
 */

/**
 * 
 * @param {type} Node
 * @param {type} InterfaceCommander
 * @param {type} Projection
 * @param {type} NodeMesh
 * @returns {Layer_L15.Layer}
 */
define('Scene/Layer', [
    'THREE',
    'Scene/Node',
    'Core/Commander/InterfaceCommander',
    'Core/Geographic/Projection',
    'Renderer/NodeMesh'
], function(THREE, Node, InterfaceCommander, Projection, NodeMesh) {

    function Layer(type, param) {
        //Constructor

        Node.call(this);
        // Requeter
        this.interCommand = type !== undefined ? new InterfaceCommander(type, param) : undefined;
        this.descriManager = null;
        this.projection = new Projection();

    }

    Layer.prototype = Object.create(Node.prototype);

    Layer.prototype.constructor = Layer;

    // Should be plural as it return an array of meshes
    Layer.prototype.getMesh = function() {
        var meshs = [];

        for (var i = 0; i < this.children.length; i++) {
            var node = this.children[i];


            if (node instanceof NodeMesh || node instanceof THREE.Mesh)
                meshs.push(node);
            else if (node instanceof Layer) {
                meshs = meshs.concat(node.getMesh());
            }
        }

        return meshs;

    };

    return Layer;

});
