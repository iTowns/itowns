/**
* Generated On: 2015-10-5
* Class: Layer
* Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
* 
*/


define('Scene/Layer',[
    'Scene/Node',
    'Core/Commander/InterfaceCommander',
    'Core/Geographic/Projection',
    'Renderer/NodeMesh'], function(Node,InterfaceCommander,Projection,NodeMesh){

    function Layer(type){
        //Constructor

        Node.call( this );
        // Requeter
        this.interCommand   = new InterfaceCommander(type);
        this.descriManager  = null;
        this.projection     = new Projection();
                       
    }
       
    Layer.prototype = Object.create( Node.prototype );

    Layer.prototype.constructor = Layer;
    
    Layer.prototype.getMesh = function()
    {
        var meshs = [];
                                
        for (var i = 0; i < this.children.length; i++)
        {
            var node = this.children[i];
            
            if(node instanceof NodeMesh)            
                meshs.push(node);            
            else if(node instanceof Layer)
            {                                
                meshs = meshs.concat(node.getMesh());
            }
        }
        
        return meshs;
                
    };
         
    return Layer;
    
});

