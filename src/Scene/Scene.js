/**
* Generated On: 2015-10-5
* Class: Scene
* Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
*/

define('Scene/Scene',['Renderer/c3DEngine','Globe/Star','Globe/Globe','Renderer/NodeMesh','Core/Commander/ManagerCommands','Scene/BrowseTree'], function(c3DEngine,Star,Globe,NodeMesh,ManagerCommands,BrowseTree){
 
    var instanceScene = null;

    function Scene(){
        //Constructor
        
        if(instanceScene !== null){
            throw new Error("Cannot instantiate more than one Scene");
        } 

        
        this.browserScene   = new BrowseTree();
        this.nodes          = [];      
       
        this.cameras        = null;
        this.currentCamera  = null;
        this.selectNodes    = null;      
        this.managerCommand = ManagerCommands();
        this.gfxEngine      = c3DEngine(this);                
                
        this.add(new Globe());
        this.add(new Star());                   
        
        this.gfxEngine.renderScene();
    }

    Scene.prototype.constructor = Scene;
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
        this.browserScene.browse(this.nodes[0].terrain);
        
    };
    
    /**
    */
    Scene.prototype.updateScene3D = function(){
        //TODO: Implement Me 
       
    };

    Scene.prototype.wait = function(){
        var waitTime = 250;
        if(this.timer === null)
        { 
            this.timer = window.setTimeout(this.sceneProcess.bind(this),waitTime); 
        }
        else
        {
            window.clearInterval(this.timer);
            this.timer = window.setTimeout(this.sceneProcess.bind(this),waitTime); 
        }
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

    return function(){
        instanceScene = instanceScene || new Scene();
        return instanceScene;
    };

});

