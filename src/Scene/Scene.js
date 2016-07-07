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
    'Core/Commander/Providers/TileProvider',
    'Core/Commander/Providers/PanoramicProvider',
    'Core/Math/Ellipsoid',
    'Renderer/PanoramicMesh',
    'Scene/BrowseTree',
    'Scene/NodeProcess',
    'Scene/Quadtree',
    'Core/Geographic/CoordStars',
    'Core/defaultValue',
    'Scene/Layer',
    'Core/Geographic/CoordCarto',
    'Core/System/Capabilities',
    'MobileMapping/MobileMappingLayer'],

    function(
        c3DEngine,
        Globe,
        ManagerCommands,
        TileProvider,
        PanoramicProvider,
        Ellipsoid,
        PanoramicMesh,
        BrowseTree,
        NodeProcess,
        Quadtree,
        CoordStars,
        defaultValue,
        Layer,
        CoordCarto,
        Capabilities,
        MobileMappingLayer) {

    var instanceScene = null;
    var event = new Event('globe-built');
    var NO_SUBDIVISE = 0;
    var SUBDIVISE = 1;
    var CLEAN = 2;

    function Scene(coordCarto,viewerDiv, debugMode,gLDebug) {

        if (instanceScene !== null) {
            throw new Error("Cannot instantiate more than one Scene");
        }

        // /!\ Doesn't work
        this.size = {x:6378137,y: 6356752.3142451793,z:6378137};

        var positionCamera = new Ellipsoid(this.size).cartographicToCartesian(new CoordCarto().setFromDegreeGeo(coordCarto.longitude, coordCarto.latitude, coordCarto.altitude));

        this.layers = [];
        this.map = null;

        this.cameras = null;
        this.selectNodes = null;
        this.managerCommand = ManagerCommands(this);
        this.orbitOn = false;

        this.gLDebug = gLDebug;
        this.gfxEngine = c3DEngine(this,positionCamera,viewerDiv, debugMode,gLDebug);
        this.browserScene = new BrowseTree(this.gfxEngine);
        this.cap = new Capabilities();

		this.time = 0;
        this.orbitOn = false;
        this.rAF = null;

        this.viewerDiv = viewerDiv;
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

    Scene.prototype.currentControls = function() {
        return this.gfxEngine.controls;
    };

    Scene.prototype.getPickPosition = function (mouse){
        return this.gfxEngine.getPickingPositionFromDepth(mouse);
    };

    Scene.prototype.getEllipsoid = function(){
        return this.layers[0].node.ellipsoid;
    }

    Scene.prototype.updateCamera = function() {
        for(var i = 0; i < this.layers.length; i++) {
            this.layers[i].process.updateCamera(this.gfxEngine.camera);
        }
    };
//    Scene.prototype.getZoomLevel = function(){
//        return this.selectNodes;
//    };

    Scene.prototype.size = function() {
        return this.size;
    };

    /**
     *
     * @returns {undefined}
     */
    Scene.prototype.quadTreeRequest = function(quadtree, process){

        this.browserScene.browse(quadtree,this.currentCamera(), process, SUBDIVISE);
        this.managerCommand.runAllCommands().then(function()
            {
                if (this.managerCommand.isFree())
                {
                    this.browserScene.browse(quadtree,this.currentCamera(), process, SUBDIVISE);
                    if (this.managerCommand.isFree()){
                        this.browserScene.browse(quadtree,this.currentCamera(), process, CLEAN)
                        this.viewerDiv.dispatchEvent(event);

                    }
                }

            }.bind(this));

        this.renderScene3D();

    };

    Scene.prototype.realtimeSceneProcess = function() {

        for (var l = 0; l < this.layers.length; l++) {
            var layer = this.layers[l].node;
            var process = this.layers[l].process;

            for (var sl = 0; sl < layer.children.length; sl++) {
                var sLayer = layer.children[sl];

                if (sLayer instanceof Quadtree)
                    this.browserScene.browse(sLayer, this.currentCamera(), process, NO_SUBDIVISE);
                else if (sLayer instanceof MobileMappingLayer)
                    this.browserScene.updateMobileMappingLayer(sLayer,this.currentCamera());
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

        window.clearInterval(this.timer);

        this.timer = window.setTimeout(this.quadTreeRequest.bind(this), waitTime,this.layers[0].node.tiles, this.layers[0].process);
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
    Scene.prototype.add = function(node, nodeProcess) {

        if(node instanceof Globe)
        {
            this.map = node;
            this.managerCommand.addMapProvider(node);
            nodeProcess = nodeProcess || new NodeProcess(this.currentCamera(), node.size);
            //this.quadTreeRequest(node.tiles, nodeProcess);

        }

        this.layers.push({node: node, process: nodeProcess});
        this.gfxEngine.add3DScene(node.getMesh());
        console.log(node.getMesh(), nodeProcess);
    };

    Scene.prototype.getMap = function()
    {
        return this.map;
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

                this.layers[1].node.visible = true;
                this.layers[1].node.children[0].visible = true;

            }else{

                var mobileMappingLayer = new MobileMappingLayer();
                mobileMappingLayer.initiatePanoramic();

                var immersive = new Layer();
                immersive.add(mobileMappingLayer);
                this.add(immersive);
            }
        }else
        {
            this.layers[1].node.visible = false;
            this.layers[1].node.children[0].visible = false; // mobileMappingLayer
        }

        this.updateScene3D();
    };

     Scene.prototype.setLightingPos = function(pos){

        if(pos)
            this.lightingPos = pos;
        else{
             var coSun = CoordStars.getSunPositionInScene(this.getEllipsoid(), new Date().getTime(),48.85, 2.35);
             this.lightingPos = coSun;
        }

        defaultValue.lightingPos = this.lightingPos;

        this.browserScene.updateMaterialUniform("lightPosition", this.lightingPos.clone().normalize());
        this.layers[0].node.updateLightingPos(this.lightingPos);
     };

     // Should be moved in time module: A single loop update registered object every n millisec
     Scene.prototype.animateTime = function(value){

        if(value){
            this.time += 4000;

            if( this.time){

                var nMilliSeconds = this.time;
                var coSun= CoordStars.getSunPositionInScene(this.getEllipsoid(), new Date().getTime() + 3.6 * nMilliSeconds, 0, 0);
                this.lightingPos = coSun;
                this.browserScene.updateMaterialUniform("lightPosition", this.lightingPos.clone().normalize());
                this.layers[0].node.updateLightingPos(this.lightingPos);
                if (this.orbitOn){  // ISS orbit is 0.0667 degree per second -> every 60th of sec: 0.00111;
                     var p = this.gfxEngine.camera.camera3D.position;
                     var r = Math.sqrt(p.z * p.z + p.x * p.x);
                     var alpha = Math.atan2(p.z, p.x) + 0.0001;
                     p.x = r * Math.cos(alpha);
                     p.z = r * Math.sin(alpha);
                }

                this.gfxEngine.update();
               // this.gfxEngine.renderScene();
             }
             this.rAF = requestAnimationFrame(this.animateTime.bind(this));

        } else
              window.cancelAnimationFrame(this.rAF);
     };

    Scene.prototype.orbit = function(value) {

         //this.gfxEngine.controls = null;
         this.orbitOn = value;
    };

    return function(coordCarto,debugMode,gLDebug) {
        instanceScene = instanceScene || new Scene(coordCarto,debugMode,gLDebug);
        return instanceScene;
    };

});
