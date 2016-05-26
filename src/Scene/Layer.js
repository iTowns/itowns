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
    'Core/Geographic/Projection',
    'Renderer/NodeMesh'
], function(THREE, Node, Projection, NodeMesh) {

    function Layer(type, param) {
        //Constructor

        Node.call(this);
        // Requeter
        this.descriManager = null;
        this.projection = new Projection();
        this.id = Layer.count++;
        this.services =[];

    }

    Layer.count = 0;

    Layer.prototype = Object.create(Node.prototype);

    Layer.prototype.constructor = Layer;

    // Should be plural as it return an array of meshes
    Layer.prototype.getMesh = function() {
        var meshs = [];

        for (var i = 0; i < this.children.length; i++) {
            var node = this.children[i];


            if (node instanceof NodeMesh || node instanceof THREE.Mesh || node instanceof THREE.Object3D)
                meshs.push(node);
            else if (node instanceof Layer) {
                meshs = meshs.concat(node.getMesh());
            }
        }

        return meshs;

    };

    return Layer;

});
