/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */


define('Core/Commander/Interfaces/ApiInterface/ApiGlobe', [
       'Core/Commander/Interfaces/EventsManager',
       'Scene/Scene',
       'Globe/Globe',
       'Core/Commander/Providers/WMTS_Provider',
       'Core/Geographic/Projection'], function(
           EventsManager, 
           Scene,
           Globe,
           WMTS_Provider,
           Projection) {

    function ApiGlobe() {
        //Constructor

        this.scene = null;
        this.commandsTree = null;
        this.projection = new Projection();

    }


    ApiGlobe.prototype.constructor = ApiGlobe;
    

    /**
     * @param Command
     */
    ApiGlobe.prototype.add = function(/*Command*/) {
        //TODO: Implement Me 

    };


    /**
     * @param commandTemplate
     */
    ApiGlobe.prototype.createCommand = function(/*commandTemplate*/) {
        //TODO: Implement Me 

    };

    /**
     */
    ApiGlobe.prototype.execute = function() {
        //TODO: Implement Me 

    };

    ApiGlobe.prototype.createSceneGlobe = function(pos) {
        //TODO: Normalement la creation de scene ne doit pas etre ici....
        // A� deplacer plus tard

        this.scene = Scene();
        this.scene.init(pos);

        return this.scene;

    };
    
    ApiGlobe.prototype.setLayerAtLevel = function(baseurl,layer/*,level*/) {
 // TODO CLEAN AND GENERIC
        var wmtsProvider = new WMTS_Provider({url:baseurl, layer:layer});
        this.scene.managerCommand.providerMap[4] = wmtsProvider;
        this.scene.managerCommand.providerMap[5] = wmtsProvider;
        this.scene.managerCommand.providerMap[this.scene.layers[0].meshTerrain.layerId].providerWMTS = wmtsProvider;
        this.scene.browserScene.updateNodeMaterial(wmtsProvider);
        this.scene.renderScene3D();
    };

    ApiGlobe.prototype.showClouds = function(value) {

        this.scene.layers[0].showClouds(value);
    };
    
    ApiGlobe.prototype.setRealisticLightingOn = function(value) {

        this.scene.gfxEngine.setLightingOn(value);
        this.scene.layers[0].setRealisticLightingOn(value);
        this.scene.browserScene.updateMaterialUniform("lightingOn",value ? 1:0);
    }; 
    

    ApiGlobe.prototype.setStreetLevelImageryOn = function(value){
        
        this.scene.setStreetLevelImageryOn(value);
    }

     /**
    * Gets orientation angles of the current camera, in degrees.
    * @constructor
    */
    ApiGlobe.prototype.getCameraOrientation = function () {
        
        var tiltCam = this.scene.currentControlCamera().getTiltCamera();
        var headingCam = this.scene.currentControlCamera().getHeadingCamera();
        return [tiltCam, headingCam];
    };
    
    /**
    * Get the camera location projected on the ground in lat,lon.
    * @constructor
    */
    
    ApiGlobe.prototype.getCameraLocation = function () {
        
        var cam = this.scene.currentCamera();
        return this.projection.cartesianToGeo(cam.camera3D.position);
    };
    
    /**
    * Gets the coordinates of the current central point on screen.
    * @constructor
    */
    
    ApiGlobe.prototype.getCenter = function () {
        
        var controlCam = this.scene.currentControlCamera();       
        return this.projection.cartesianToGeo(controlCam.globeTarget.position);
    };
    
    /**
    * Moves the central point on screen to specific coordinates.
    * @constructor
    * @param {Position} position - The position on the map.
    */
    
    ApiGlobe.prototype.setCenter = function (/*position*/) {
        //TODO: Implement Me 
    };
    
    ApiGlobe.prototype.setCameraOrientation = function (/*param,pDisableAnimationopt*/) {
        //TODO: Implement Me 
    };
    
    ApiGlobe.prototype.pickPosition = function () {
        //TODO: Implement Me 
        
        
    };
    
    ApiGlobe.prototype.launchCommandApi = function () {
//        console.log(this.getCenter());
//        console.log(this.getCameraLocation());
//        console.log(this.getCameraOrientation());
    };

    ApiGlobe.prototype.showKML = function(value) {
        
        this.scene.layers[0].showKML(value);
        this.scene.renderScene3D();
    };
    
     ApiGlobe.prototype.setStat = function(value){
         
        this.scene.setStat(value);
     };


    return ApiGlobe;

});
