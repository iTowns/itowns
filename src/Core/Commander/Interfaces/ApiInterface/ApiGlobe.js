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
       'Core/Geographic/CoordCarto',
       'Core/Geographic/Projection'], function(
           EventsManager, 
           Scene,
           Globe,
           WMTS_Provider,
           CoordCarto,
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
        
        var tiltCam = this.scene.currentControls().getTiltCamera();
        var headingCam = this.scene.currentControls().getHeadingCamera();
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
        
        var controlCam = this.scene.currentControls();    
        return this.projection.cartesianToGeo(controlCam.globeTarget.position);
    };
    
    /**
    * Gets orientation angles of the current camera, in degrees.
    * @constructor
    * @param {Orientation} Param - The angle of the rotation in degrees.
    */   
      
    ApiGlobe.prototype.setCameraOrientation = function (orientation /*param,pDisableAnimationopt*/) {
        
        this.setHeading(orientation.heading);
        this.setTilt(orientation.tilt);
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
        
        var tiltCam = this.scene.currentControls().getTilt();
        return tiltCam;
    };
    
    /**
    * Get the rotation.
    * @constructor
    * @return {Angle} number - The angle of the rotation in degrees.
    */  
    
    ApiGlobe.prototype.getHeading = function (){
        
        var headingCam = this.scene.currentControls().getHeading();
        return headingCam;
    };
    
    /**
    * Get the "range", i.e. distance in meters of the camera from the center.
    * @constructor
    * @return {Number} number 
    */  
    
    ApiGlobe.prototype.getRange = function (){
                
//        var ellipsoid = this.scene.getEllipsoid();
//        var ray = this.scene.currentControls().getRay();
        
//        console.log('inters',ellipsoid.intersection(ray));
        
        var controlCam = this.scene.currentControls();               
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
        
        this.scene.currentControls().setTilt(tilt);
    };
        
    /**
    * Change the tilt.
    * @constructor
    * @param {Angle} Number - The angle.
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.setHeading = function (heading/*, bool*/){
        
        this.scene.currentControls().setHeading(heading);
    };
    
    /**
    * Resets camera tilt.
    * @constructor
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.resetTilt = function (/*bool*/) {
        
        this.scene.currentControls().setTilt(0);
    };
    
    /**
    * Resets camera heading. 
    * @constructor
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.resetHeading = function (/*bool*/) {
        
        this.scene.currentControls().setHeading(0);
    };
    
    /**
    * Return the distance in meter between two geographic position.
    * @constructor
    * @param {Position} First - Position.
    * @param {Position} Second - Position.
    */ 
    
    ApiGlobe.prototype.computeDistance = function(p1,p2){

        this.scene.getEllipsoid().computeDistance(p1,p2);
    };
    
    /**
    * Moves the central point on screen to specific coordinates.
    * @constructor
    * @param {Position} position - The position on the map.
    */
    
    ApiGlobe.prototype.setCenter = function (position) {
        
        var position3D = this.scene.getEllipsoid().cartographicToCartesian(position);
        this.scene.currentControls().setCenter(position3D); 
    };
    
    /**
    * Set the "range", i.e. distance in meters of the camera from the center.
    * @constructor
    * @param {Number} pRange - The camera altitude.
    * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
    */ 
    
    ApiGlobe.prototype.setRange = function (pRange/*, bool*/){
        
        this.scene.currentControls().setRange(pRange);
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
//        
//        var p = new CoordCarto(2.438544,49.8501392,0);
//        this.setCenter(p);
//        
//        this.testTilt();
//        this.testHeading();
        //console.log("range 1  " + this.getRange());
        //this.setRange(1000);
//        console.log(this.getRange());
//        this.setCameraOrientation({heading:45,tilt:30});
    };
    
//    ApiGlobe.prototype.testTilt = function (){
//        this.setTilt(90);
//        console.log(this.getTilt());
//        this.resetTilt();
//        console.log(this.getTilt());
//    };
//    
//    ApiGlobe.prototype.testHeading = function (){
//        this.setHeading(90);
//        console.log(this.getHeading());
//        this.resetHeading();
//        console.log(this.getHeading());
//    };

    ApiGlobe.prototype.showKML = function(value) {
        
        this.scene.layers[0].showKML(value);
        this.scene.renderScene3D();
    };


    return ApiGlobe;

});
