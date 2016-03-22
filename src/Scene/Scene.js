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
define('Scene/Scene', [
    'Renderer/c3DEngine',
    'three',
    'Globe/Globe',
    'Core/Commander/ManagerCommands',
    'Core/Commander/Providers/tileGlobeProvider',
    'Core/Commander/Providers/BuildingBox_Provider',
    'Core/Commander/Providers/PanoramicProvider',
    'Renderer/PanoramicMesh',
    'Scene/BrowseTree',
    'Scene/NodeProcess',
    'Scene/Quadtree',
    'Scene/Layer',
    'Core/Geographic/CoordCarto',
    'Core/System/Capabilities',
    'MobileMapping/MobileMappingLayer',
    'Globe/StatisticsLayer'
    
], function(c3DEngine, THREE, Globe, ManagerCommands, tileGlobeProvider, BuildingBox_Provider,
            PanoramicProvider, PanoramicMesh, BrowseTree, NodeProcess, Quadtree, Layer, CoordCarto,
            Capabilities, MobileMappingLayer, StatisticsLayer) {

    var instanceScene = null;
    
    var NO_SUBDIVISE = 0;
    var SUBDIVISE = 1;
    var CLEAN = 2;

    function Scene() {
        //Constructor        
        if (instanceScene !== null) {
            throw new Error("Cannot instantiate more than one Scene");
        }
        this.layers = [];
        this.cameras = null;
        this.selectNodes = null;
        this.managerCommand = ManagerCommands();
        
        this.supportGLInspector = false;
        //this.supportGLInspector = true;
        this.gfxEngine = c3DEngine(this.supportGLInspector);
        this.browserScene = new BrowseTree(this.gfxEngine);
        this.cap = new Capabilities();
    }

    Scene.prototype.constructor = Scene;
    /**
     */
    Scene.prototype.updateCommand = function() {
        //TODO: Implement Me 

    };

    /**
     * @documentation: return current camera 
     * @returns {Scene_L7.Scene.gfxEngine.camera}
     */
    Scene.prototype.currentCamera = function() {        
        return this.gfxEngine.camera;
    };
    
    Scene.prototype.currentControlCamera = function() {
        return this.gfxEngine.controls;
    };

    Scene.prototype.updateCamera = function() {
        this.browserScene.NodeProcess().updateCamera(this.gfxEngine.camera);
    };

    /**
     * @documentation: initialisation scene 
     * @returns {undefined}
     */
    Scene.prototype.init = function(pos) {
        
        this.managerCommand.init(this);
        var globe = new Globe(this.supportGLInspector);
        this.add(globe);
        this.managerCommand.addLayer(globe.meshTerrain, new tileGlobeProvider(globe.size,this.supportGLInspector));
        this.managerCommand.addLayer(globe.colorTerrain,this.managerCommand.getProvider(globe.meshTerrain).providerWMTS);
        this.managerCommand.addLayer(globe.elevationTerrain,this.managerCommand.getProvider(globe.meshTerrain).providerWMTS);
        
        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,25000000));        
        //
        var position = globe.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(pos.lat, pos.lon, pos.alt));

        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,,25000000));
        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.7,2.33,25000000));        

        //var target      = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,0));
        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(0,48.87,25000000));

        this.gfxEngine.init(this, position);
        this.browserScene.addNodeProcess(new NodeProcess(this.currentCamera().camera3D, globe.size));            
        this.sceneProcess();
    };

    Scene.prototype.size = function() {
        return this.layers[0].size;
    };

    /**
     * 
     * @returns {undefined}
     */   
    Scene.prototype.sceneProcess = function(){ 
        if(this.layers[0] !== undefined  && this.currentCamera() !== undefined )
        {                        
        
            this.browserScene.browse(this.layers[0].meshTerrain,this.currentCamera(),SUBDIVISE);         
            this.managerCommand.runAllCommands().then(function()
                {                   
                    if (this.managerCommand.commandsLength() === 0)
                    {                        
                        this.browserScene.browse(this.layers[0].meshTerrain,this.currentCamera(),SUBDIVISE);
                        if (this.managerCommand.commandsLength() === 0)                            
                            this.browserScene.browse(this.layers[0].meshTerrain,this.currentCamera(),CLEAN);
                    }
                    
                }.bind(this));
            
            this.renderScene3D();                
            //this.updateScene3D();                 
        }         
    };

    
    Scene.prototype.realtimeSceneProcess = function() {

        if (this.currentCamera !== undefined)
            if(this.layers[1] !== undefined) this.browserScene.browse(this.layers[1],this.currentCamera());  // temp //MobileMappingLayer
            for (var l = 0; l < this.layers.length; l++) {
                var layer = this.layers[l];

                for (var sl = 0; sl < layer.children.length; sl++) {
                    var sLayer = layer.children[sl];

                    if (sLayer instanceof Quadtree)
                        this.browserScene.browse(sLayer, this.currentCamera(), NO_SUBDIVISE);
                    else if (sLayer instanceof Layer)
                        this.browserScene.updateLayer(sLayer,this.currentCamera());

                }
            }
    };

    /**
     * 
     * @returns {undefined}
     */
    Scene.prototype.updateScene3D = function() {

        this.gfxEngine.update();
    };

    Scene.prototype.wait = function(timeWait) {

        var waitTime = timeWait ? timeWait: 20;

        this.realtimeSceneProcess();

        if (this.timer === null) {
            this.timer = window.setTimeout(this.sceneProcess.bind(this), waitTime);
        } else {
            window.clearInterval(this.timer);
            this.timer = window.setTimeout(this.sceneProcess.bind(this), waitTime);
        }

    };

    /**
     */
    Scene.prototype.renderScene3D = function() {

        this.gfxEngine.renderScene();

    };

    Scene.prototype.scene3D = function() {

        return this.gfxEngine.scene3D;
    };

    /**
     * @documentation: Ajoute des Layers dans la scène.
     *
     * @param node {[object Object]} 
     */
    Scene.prototype.add = function(node) {
        //TODO: Implement Me 

        this.layers.push(node);        

        this.gfxEngine.add3DScene(node.getMesh());
    };
  
    /**
     * @documentation: Retire des layers de la scène
     *
     * @param layer {[object Object]} 
     */
    Scene.prototype.remove = function(/*layer*/) {
        //TODO: Implement Me 

    };


    /**
     * @param layers {[object Object]} 
     */
    Scene.prototype.select = function(/*layers*/) {
        //TODO: Implement Me 

    };

    Scene.prototype.selectNodeId = function(id) {

        this.browserScene.selectedNodeId = id;

    };
    
    Scene.prototype.setStreetLevelImageryOn = function(value){
        
         if(value){
               if(this.layers[1]) {
                this.layers[1].panoramicMesh.visible = true;
            }else{

                var mobileMappingLayer = new MobileMappingLayer();   
                mobileMappingLayer.initiatePanoramic();
                this.add(mobileMappingLayer);
            }
        }else{
            this.layers[1].panoramicMesh.visible = false; // mobileMappingLayer
        }
        
        this.updateScene3D();
    };
    
    
    Scene.prototype.setStat = function(value, arrayStats, arrayNbAttributesPerClass){
    
        if( this.statisticsLayer === undefined){   // Register all layer name with associated url
            
            this.statisticsLayer = new StatisticsLayer();
            for(var i=0; i< arrayStats.length; ++i){
                this.statisticsLayer.addDataUrl(arrayStats[i], {url: "../dist/stats/" + arrayStats[i] + ".json", nbAttributes: arrayNbAttributesPerClass[i]});
            }
            
            console.log("setStat", value);
            this.statisticsLayer.showData(value);
            this.add(this.statisticsLayer);
        }else{
            this.statisticsLayer.showData(value);
        }

    };

    return function() {
        instanceScene = instanceScene || new Scene(); 
        return instanceScene;
    };

});
