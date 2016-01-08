/**
* Generated On: 2015-10-5
* Class: Scene
* Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
*/

/**
 * 
 * @param {type} c3DEngine
 * @param {type} Globe
 * @param {type} ManagerCommands
 * @param {type} BrowseTree
 * @returns {Function}
 */
define('Scene/Scene',[    
    'Renderer/c3DEngine',    
    'Globe/Globe',
    'Core/Commander/ManagerCommands',
    'Scene/BrowseTree',
    'Scene/NodeProcess',
    'Scene/Quadtree',
    'Scene/Layer',
    'Core/Geographic/CoordCarto',
    'Core/System/Capabalities'], function(c3DEngine,Globe,ManagerCommands,BrowseTree,NodeProcess,Quadtree,Layer,CoordCarto,Capabalities){
 
    var instanceScene = null;

    function Scene(){
        //Constructor        
        if(instanceScene !== null){
            throw new Error("Cannot instantiate more than one Scene");
        }         
        this.layers          = [];            
        this.cameras        = null;        
        this.selectNodes    = null;      
        this.managerCommand = ManagerCommands();
        this.gfxEngine      = c3DEngine();                       
        this.browserScene   = new BrowseTree(this);
        this.cap            = new Capabalities();

    }

    Scene.prototype.constructor = Scene;
    /**
    */
    Scene.prototype.updateCommand = function(){
        //TODO: Implement Me 

    };    
    
    Scene.prototype.updateCommand = function(){
        //TODO: Implement Me 
    };    
 
    /**
     * @documentation: return current camera 
     * @returns {Scene_L7.Scene.gfxEngine.camera}
     */
    Scene.prototype.currentCamera = function(){
        return this.gfxEngine.camera ;
    };
    
    Scene.prototype.updateCamera = function()
    {
        this.browserScene.NodeProcess().updateCamera(this.gfxEngine.camera);
    };
    
    /**
     * @documentation: initialisation scene 
     * @returns {undefined}
     */
    Scene.prototype.init = function()
    {                    
        this.managerCommand.init(this);
        var globe = new Globe(); 
        this.add(globe);
        
        var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,25000000));        
        //var target      = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,0));
        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(0,48.87,25000000));
                       
        this.gfxEngine.init(this,position);
        this.browserScene.addNodeProcess(new NodeProcess(this.currentCamera().camera3D,globe.size));
        this.gfxEngine.update();
                
    };
    
    Scene.prototype.size = function()
    {
        return this.layers[0].size;
    };

    /**
    */
    Scene.prototype.updateCamera = function(){
        //TODO: Implement Me 

    };

    /**
     * @documentation: 
     * @returns {undefined}
     */
    Scene.prototype.sceneProcess = function(run){
        
        //console.log(this.managerCommand.queueAsync.length);
        
        if(this.layers[0] !== undefined  && this.currentCamera() !== undefined )
        {                        
        
            this.browserScene.browse(this.layers[0].terrain,this.currentCamera(),true);
            
            if(run)
                this.managerCommand.runAllCommands();
            
            this.renderScene3D();            
        } 
        
    };
    
    Scene.prototype.realtimeSceneProcess = function(){        
        
        if(this.currentCamera !== undefined )
            for(var l = 0; l <  this.layers.length;l++)
            {                            
                var layer = this.layers[l];
                
                for(var sl = 0; sl <  layer.children.length;sl++)
                {
                   var sLayer = layer.children[sl];
                   
                   if(sLayer instanceof Quadtree)
                        this.browserScene.browse(sLayer,this.currentCamera(),false);
                   else if(sLayer instanceof Layer)
                        for(var c = 0; c <  sLayer.children.length; c++)
                        {
                            var node = sLayer.children[c];
                            node.material.setMatrixRTC(this.browserScene.getRTCMatrix(node.position,this.currentCamera()));
                        }
                }
                
            }                
    };
    
    /**
    */
    Scene.prototype.updateScene3D = function(run){
                
       this.gfxEngine.update(run);
    };
    
    Scene.prototype.wait = function(run){
        
        var waitTime = 100;
        
        if(run === undefined)
            run = true;
        else if(run === false)
            this.sceneProcess();
        else
            this.realtimeSceneProcess();
        
        if(this.timer === null)
        { 
            this.timer = window.setTimeout(this.sceneProcess.bind(this),waitTime,run); 
        }
        else
        {
            window.clearInterval(this.timer);
            this.timer = window.setTimeout(this.sceneProcess.bind(this),waitTime,run); 
        }
        
    };

    /**
    */
    Scene.prototype.renderScene3D = function(){
        
        this.gfxEngine.renderScene();

    };
    
    Scene.prototype.scene3D = function(){
        
        return this.gfxEngine.scene3D;
    };

    /**
    * @documentation: Ajoute des Layers dans la scène.
    *
    * @param layer {[object Object]} 
    */
    Scene.prototype.add = function(node){
        //TODO: Implement Me 
        
        this.layers.push(node);                
        
        this.gfxEngine.add3DScene(node.getMesh());
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
    * @param layers {[object Object]} 
    */
    Scene.prototype.select = function(layers){
        //TODO: Implement Me 

    };

    return function(){
        instanceScene = instanceScene || new Scene();
        return instanceScene;
    };

});

