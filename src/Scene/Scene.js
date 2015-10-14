/**
* Generated On: 2015-10-5
* Class: Scene
* Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
*/

define('Scene/Scene',['Renderer/c3DEngine','Globe/Star','Globe/Globe','Renderer/NodeMesh','Core/Commander/ManagerCommands'], function(c3DEngine,Star,Globe,NodeMesh,ManagerCommands){
 

    function Scene(){
        //Constructor

        this.gfxEngine      = new c3DEngine();
        this.browserScene   = null;
        this.nodes          = [];      
        this.managerCommand = ManagerCommands();
        this.cameras        = null;
        this.currentCamera  = null;
        this.selectNodes    = null;
        
        this.add(new Star());                        
        this.add(new Globe());
        
        this.gfxEngine.renderScene();
    }

    /**
    */
    Scene.prototype.updateCommand = function(){
        //TODO: Implement Me 

    };


    /**
    */
    Scene.prototype.updateCamera = function(){
        //TODO: Implement Me 

    };


    /**
    * @param currentCamera {[object Object]} 
    */
    Scene.prototype.sceneProcess = function(currentCamera){
        //TODO: Implement Me 

    };


    /**
    */
    Scene.prototype.updateScene3D = function(){
        //TODO: Implement Me 

    };


    /**
    */
    Scene.prototype.renderScene3D = function(){
        
        this.gfxEngine.renderScene();

    };

    /**
    * @documentation: Ajoute des Layers dans la scène.
    *
    * @param layer {[object Object]} 
    */
    Scene.prototype.add = function(layer){
        //TODO: Implement Me 
        
        this.nodes.push(layer);
        
        if(layer instanceof NodeMesh)            
            
            this.gfxEngine.add3DScene(layer);

        else if(layer instanceof Globe)            
        {
            var meshs = layer.getMesh();
            for (var i = 0;i<meshs.length;i++)                            
                this.gfxEngine.add3DScene(meshs[i]);
        }
    };

    /**
    * @documentation: Retire des layers de la scène
    *
    * @param layer {[object Object]} 
    */
    Scene.prototype.remove = function(layer){
        //TODO: Implement Me 

    };


    /**
    * @param nodes {[object Object]} 
    */
    Scene.prototype.select = function(nodes){
        //TODO: Implement Me 

    };

    return Scene;

});

