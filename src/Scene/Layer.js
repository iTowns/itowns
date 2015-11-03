/**
* Generated On: 2015-10-5
* Class: Layer
* Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
* 
*/


define('Scene/Layer',['Scene/Node','Core/Commander/InterfaceCommander','Core/Geographic/Projection'], function(Node,InterfaceCommander,Projection){

    function Layer(type){
        //Constructor

        Node.call( this );
        this.interCommand   = new InterfaceCommander(type);
        this.descriManager  = null;
        this.projection     = new Projection();
                       
    }
       
    Layer.prototype = Object.create( Node.prototype );

    Layer.prototype.constructor = Layer;
         
    return Layer;
    
});

