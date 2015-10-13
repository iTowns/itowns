/**
* Generated On: 2015-10-5
* Class: Layer
* Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
* 
*/


define('Scene/Layer',['Scene/Node','Core/Commander/InterfaceCommander','Scene/Quadtree'], function(Node,InterfaceCommander,Quadtree){

    function Layer(managerCommand,tree){
        //Constructor

        Node.call( this );
        this.interCommand   = new InterfaceCommander(managerCommand);
        this.descriManager  = null;
        this.projection     = null;
        this.tree           = tree;
       
    }
       
    Layer.prototype = Object.create( Node.prototype );

    Layer.prototype.constructor = Layer;
    
    Layer.prototype.getMesh = function(){
               
        return this.tree.children;
    };
  
    return Layer;
    
});

