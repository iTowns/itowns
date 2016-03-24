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

    ApiGlobe.prototype.createSceneGlobe = function(coordCarto) {
        //TODO: Normalement la creation de scene ne doit pas etre ici....
        // A� deplacer plus tard

        var supportGLInspector = false;
        //supportGLInspector = true;

        this.scene = new Scene(supportGLInspector);
        this.scene.add(new Globe(supportGLInspector),coordCarto);

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
        
        var cam = this.scene.currentCamera().camera3D;
        return this.projection.cartesianToGeo(cam.position);
    };
    
    /**
    * Gets the coordinates of the current central point on screen.
    * @constructor
    * @return {Position} postion
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
    
    /**
    * Pick a position on the globe at the given position.
    * @constructor
    * @param {Number | MouseEvent} x|event - The x-position inside the Globe element or a mouse event.
    * @param {number | undefined} y - The y-position inside the Globe element.
    * @return {Position} postion
    */    
    ApiGlobe.prototype.pickPosition = function (mouse,y) {
        
        if(mouse)
            if(mouse.clientX)
            {
                mouse.x = mouse.clientX;
                mouse.y = mouse.clientY;            
            }
            else            
            {
                mouse.x = mouse;
                mouse.y = y;            
            }
            
        var pickedPosition = this.scene.getPickPosition(mouse);
        
        this.scene.renderScene3D();
        
        return this.projection.cartesianToGeo(pickedPosition);
    };
    
    /**
    * Get the tilt.
    * @constructor
    * @return {Angle} number - The angle of the rotation in degrees.
    */  
    
    ApiGlobe.prototype.getTilt = function (){
        
        var tiltCam = this.scene.currentControlCamera().getTilt();
        return tiltCam;
    };
    
    /**
    * Get the rotation.
    * @constructor
    * @return {Angle} number - The angle of the rotation in degrees.
    */  
    
    ApiGlobe.prototype.getHeading = function (){
        
        var headingCam = this.scene.currentControlCamera().getHeading();
        return headingCam;
    };
    
    /**
    * Get the "range", i.e. distance in meters of the camera from the center.
    * @constructor
    * @return {Number} number 
    */  
    
    ApiGlobe.prototype.getRange = function (){
                
        var controlCam = this.scene.currentControlCamera();               
        var center = controlCam.globeTarget.position;
        var camPosition = this.scene.currentCamera().position();        
        var range = center.distanceTo(camPosition);        
        return range;
    };
    
    /**
    * Change the tilt.
    * @constructor
    * @param {Angle} Number - The angle.
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */  
    
    ApiGlobe.prototype.setTilt = function (tilt/*, bool*/) {
        
        this.scene.currentControlCamera().setTilt(tilt);
    };
        
    /**
    * Change the tilt.
    * @constructor
    * @param {Angle} Number - The angle.
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.setHeading = function (heading/*, bool*/){
        
        this.scene.currentControlCamera().setHeading(heading);
    };
    
    /**
    * Resets camera tilt.
    * @constructor
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.resetTilt = function (/*bool*/) {
        
        this.scene.currentControlCamera().setTilt(0);
    };
    
    /**
    * Resets camera heading. 
    * @constructor
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.resetHeading = function (/*bool*/) {
        
        this.scene.currentControlCamera().setHeading(0);
    };
    
    /**
    * Return the distance in meter between two geographic position.
    * @constructor
    * @param {Position} First - Position.
    * @param {Position} Second - Position.
    */ 
    
    ApiGlobe.prototype.computeDistance = function(p1,p2){
        
        this.scene.getGlobe().computeDistance(p1,p2);
    };
    
    ApiGlobe.prototype.launchCommandApi = function () {
//        console.log(this.getCenter());
//        console.log(this.getCameraLocation());
//        console.log(this.getCameraOrientation());
//        console.log(this.pickPosition());
//        console.log(this.getTilt());
//        console.log(this.getHeading());
//        console.log(this.getRange());
//        this.setTilt(45);
//        this.setHeading(180);
//        this.resetTilt();
//        this.resetHeading();
//        this.computeDistance(p1, p2);
    };

    ApiGlobe.prototype.showKML = function(value) {
        
        this.scene.layers[0].showKML(value);
        this.scene.renderScene3D();
    };


    return ApiGlobe;

});
