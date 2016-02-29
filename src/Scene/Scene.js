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
    'Globe/Globe',
    'Flat/Plane',
    'Core/Commander/ManagerCommands',
    'Core/Commander/Providers/tileGlobeProvider',
    'Core/Commander/Providers/FlatTileProvider',
    'Scene/BrowseTree',
    'Scene/NodeProcess',
    'Scene/Quadtree',
    'Scene/Layer',
    'Core/Geographic/CoordCarto',
    'Core/System/Capabilities'
], function(c3DEngine, Globe, Plane, ManagerCommands, tileGlobeProvider, FlatTileProvider, BrowseTree, NodeProcess, Quadtree, Layer, CoordCarto, Capabilities) {

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

    Scene.prototype.updateCamera = function() {
        this.browserScene.NodeProcess().updateCamera(this.gfxEngine.camera);
    };

    /**
     * @documentation: initialisation scene 
     * @returns {undefined}
     */
    Scene.prototype.init = function(pos) {
        
        this.managerCommand.init(this);
        
        var flat = false;
        if (flat) {
            var srid = "EPSG:3946";
            var plane = new Plane(srid, {xmin:1847500, xmax:1849500, ymin:5171000, ymax:5173000}); 
            plane.size = {x:63.78137, y:63.78137, z:63.78137};//new THREE.Vector3(63.78137, 63.56752, 63.78137);
            this.add(plane);
            this.managerCommand.addLayer(plane.terrain, new FlatTileProvider(srid));
            var position = {x:1848500, y:5172000, z:300};//new THREE.Vector3(1848500, 5172000, 300);
            this.gfxEngine.init(this, position,flat);
            this.browserScene.addNodeProcess(new NodeProcess(this.currentCamera().camera3D));
            this.gfxEngine.update();
        }
        else {
            var globe = new Globe(this.supportGLInspector);
            this.add(globe);
            this.managerCommand.addLayer(globe.terrain, new tileGlobeProvider(globe.size,this.supportGLInspector));
            this.managerCommand.addLayer(globe.colorTerrain,this.managerCommand.getProvider(globe.terrain).providerWMTS);
        

            //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,25000000));        
            //
            var position = globe.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(pos.lat, pos.lon, pos.alt));

            //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,,25000000));
            //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.7,2.33,25000000));        

            //var target      = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,0));
            //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(0,48.87,25000000));

            this.gfxEngine.init(this, position);
            this.browserScene.addNodeProcess(new NodeProcess(this.currentCamera().camera3D, globe.size));
            this.gfxEngine.update();
        }
    };

    Scene.prototype.size = function() {
        return this.layers[0].size;
    };

    /**
     */
    Scene.prototype.updateCamera = function() {
        //TODO: Implement Me 

    };

    /**
     * 
     * @returns {undefined}
     */   
    Scene.prototype.sceneProcess = function(){        
        if(this.layers[0] !== undefined  && this.currentCamera() !== undefined )
        {                        
        
            this.browserScene.browse(this.layers[0].terrain,this.currentCamera(),SUBDIVISE);
                        
            this.managerCommand.runAllCommands().then(function()
                {                   
                    if (this.managerCommand.commandsLength() === 0)
                    {                        
                        this.browserScene.browse(this.layers[0].terrain,this.currentCamera(),SUBDIVISE);
                        if (this.managerCommand.commandsLength() === 0)                            
                            this.browserScene.browse(this.layers[0].terrain,this.currentCamera(),CLEAN);
                    }
                    
                }.bind(this));
            
            this.renderScene3D();                
            //this.updateScene3D();                 
        }         
    };

    
    Scene.prototype.realtimeSceneProcess = function() {

        if (this.currentCamera !== undefined)
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

        this.browserScene.selectNodeId = id;

    };

    return function() {
        instanceScene = instanceScene || new Scene();
        return instanceScene;
    };

});
