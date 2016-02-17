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
    'Core/Commander/ManagerCommands',
    'Scene/BrowseTree',
    'Scene/NodeProcess',
    'Scene/Quadtree',
    'Scene/Layer',
    'Core/Geographic/CoordCarto',
    'Core/System/Capabilities'
], function(c3DEngine, Globe, ManagerCommands, BrowseTree, NodeProcess, Quadtree, Layer, CoordCarto, Capabilities) {

    var instanceScene = null;

    function Scene() {
        //Constructor        
        if (instanceScene !== null) {
            throw new Error("Cannot instantiate more than one Scene");
        }
        this.layers = [];
        this.cameras = null;
        this.selectNodes = null;
        this.managerCommand = ManagerCommands();
        this.gfxEngine = c3DEngine();
        this.browserScene = new BrowseTree(this);
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
        var globe = new Globe();
        this.add(globe);
        console.log('eee');


        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,25000000));        
        //
        var position = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(pos.lat, pos.lon, pos.alt));

        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,,25000000));
        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.7,2.33,25000000));        

        //var target      = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,0));
        //var position    = globe.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(0,48.87,25000000));

        this.gfxEngine.init(this, position);
        this.browserScene.addNodeProcess(new NodeProcess(this.currentCamera().camera3D, globe.size));
        this.gfxEngine.update();

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
     * @param {type} run
     * @returns {undefined}
     */
    Scene.prototype.sceneProcess = function(run) {

        //console.log(this.managerCommand.queueAsync.length);

        if (this.layers[0] !== undefined && this.currentCamera() !== undefined) {

            this.browserScene.browse(this.layers[0].terrain, this.currentCamera(), true);

            this.managerCommand.runAllCommands();

            //this.renderScene3D();             
            this.updateScene3D();

        }

    };

    Scene.prototype.realtimeSceneProcess = function() {

        if (this.currentCamera !== undefined)
            for (var l = 0; l < this.layers.length; l++) {
                var layer = this.layers[l];

                for (var sl = 0; sl < layer.children.length; sl++) {
                    var sLayer = layer.children[sl];

                    if (sLayer instanceof Quadtree)
                        this.browserScene.browse(sLayer, this.currentCamera(), false);
                    else if (sLayer instanceof Layer)
                        this.browserScene.updateLayer(sLayer);

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

    Scene.prototype.wait = function() {

        var waitTime = 20;

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
    Scene.prototype.remove = function(layer) {
        //TODO: Implement Me 

    };


    /**
     * @param layers {[object Object]} 
     */
    Scene.prototype.select = function(layers) {
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
