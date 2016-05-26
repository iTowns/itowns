/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */


define('Core/Commander/Interfaces/ApiInterface/ApiGlobe', [
       'Core/Commander/Interfaces/EventsManager',
       'Scene/Scene',
       'Scene/NodeProcess',
       'Globe/Globe',
       'Core/Commander/Providers/WMTS_Provider',
       'Core/Geographic/CoordCarto',
       'Core/Geographic/Projection'], function(
           EventsManager,
           Scene,
           NodeProcess,
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

    ApiGlobe.prototype.addImageryLayer = function(layer) {

        var map = this.scene.getMap();
        var manager = this.scene.managerCommand;
        var providerWMTS = manager.getProvider(map.tiles).providerWMTS;

        providerWMTS.addLayer(layer);
        map.colorTerrain.services.push(layer.id);

    };

    ApiGlobe.prototype.addElevationLayer = function(layer) {

        var map = this.scene.getMap();
        var manager = this.scene.managerCommand;
        var providerWMTS = manager.getProvider(map.tiles).providerWMTS;

        providerWMTS.addLayer(layer);
        map.elevationTerrain.services.push(layer.id);

    };

    ApiGlobe.prototype.createSceneGlobe = function(coordCarto) {
        // TODO: Normalement la creation de scene ne doit pas etre ici....
        // Deplacer plus tard

        var gLDebug = false; // true to support GLInspector addon
        var debugMode = false;

        //gLDebug = true; // true to support GLInspector addon
        //debugMode = true;

        this.scene = Scene(coordCarto,debugMode,gLDebug);

        var map = new Globe(this.scene.size,gLDebug);

        this.scene.add(map);

        this.addImageryLayer({
            protocol:   "wmts",
            id:         "IGNPO",
            url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
            wmtsOptions: {
                    name: "ORTHOIMAGERY.ORTHOPHOTOS",
                    //name: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                    mimetype: "image/jpeg",
                    tileMatrixSet: "WGS84G",
                    tileMatrixSetLimits: {
                       /* "0": {
                            "minTileRow": 0,
                            "maxTileRow": 1,
                            "minTileCol": 0,
                            "maxTileCol": 1
                        },
                        "1": {
                            "minTileRow": 0,
                            "maxTileRow": 2,
                            "minTileCol": 0,
                            "maxTileCol": 2
                        },*/
                        "2": {
                            "minTileRow": 0,
                            "maxTileRow": 4,
                            "minTileCol": 0,
                            "maxTileCol": 4
                        },
                        "3": {
                            "minTileRow": 0,
                            "maxTileRow": 8,
                            "minTileCol": 0,
                            "maxTileCol": 8
                        },
                        "4": {
                            "minTileRow": 0,
                            "maxTileRow": 6,
                            "minTileCol": 0,
                            "maxTileCol": 16
                        },
                        "5": {
                            "minTileRow": 0,
                            "maxTileRow": 32,
                            "minTileCol": 0,
                            "maxTileCol": 32
                        },
                        "6": {
                            "minTileRow": 1,
                            "maxTileRow": 64,
                            "minTileCol": 0,
                            "maxTileCol": 64
                        },
                        "7": {
                            "minTileRow": 3,
                            "maxTileRow": 28,
                            "minTileCol": 0,
                            "maxTileCol": 128
                        },
                        "8": {
                            "minTileRow": 7,
                            "maxTileRow": 256,
                            "minTileCol": 0,
                            "maxTileCol": 256
                        },
                        "9": {
                            "minTileRow": 15,
                            "maxTileRow": 512,
                            "minTileCol": 0,
                            "maxTileCol": 512
                        },
                        "10": {
                            "minTileRow": 31,
                            "maxTileRow": 1024,
                            "minTileCol": 0,
                            "maxTileCol": 1024
                        },
                        "11": {
                            "minTileRow": 62,
                            "maxTileRow": 2048,
                            "minTileCol": 0,
                            "maxTileCol": 2048
                        },
                        "12": {
                            "minTileRow": 125,
                            "maxTileRow": 4096,
                            "minTileCol": 0,
                            "maxTileCol": 4096
                        },
                        "13": {
                            "minTileRow": 2739,
                            "maxTileRow": 4628,
                            "minTileCol": 41,
                            "maxTileCol": 7917
                        },
                        "14": {
                            "minTileRow": 5478,
                            "maxTileRow": 9256,
                            "minTileCol": 82,
                            "maxTileCol": 15835
                        },
                        "15": {
                            "minTileRow": 10956,
                            "maxTileRow": 8513,
                            "minTileCol": 165,
                            "maxTileCol": 31670
                        },
                        "16": {
                            "minTileRow": 21912,
                            "maxTileRow": 37026,
                            "minTileCol": 330,
                            "maxTileCol": 63341
                        },
                        "17": {
                            "minTileRow": 43825,
                            "maxTileRow": 74052,
                            "minTileCol": 660,
                            "maxTileCol": 126683
                        },
                        "18": {
                            "minTileRow": 87651,
                            "maxTileRow": 48105,
                            "minTileCol": 1320,
                            "maxTileCol": 253366
                        },
                        "19": {
                            "minTileRow": 175302,
                            "maxTileRow": 294060,
                            "minTileCol": 170159,
                            "maxTileCol": 343473
                        },
                        "20": {
                            "minTileRow": 376733,
                            "maxTileRow": 384679,
                            "minTileCol": 530773,
                            "maxTileCol": 540914
                            }
                    }
                }
            });

        this.addElevationLayer({
            protocol:   "wmts",
            id:         "IGN_MNT",
            url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
            noDataValue : -99999,
            wmtsOptions: {
                    name: "ELEVATION.ELEVATIONGRIDCOVERAGE",
                    mimetype: "image/x-bil;bits=32",
                    tileMatrixSet: "PM",
                    tileMatrixSetLimits: {
                         // "2": {
                         //    "minTileRow": 0,
                         //    "maxTileRow": 2,
                         //    "minTileCol": 2,
                         //    "maxTileCol": 7
                         //  },
                          "3": {
                            "minTileRow": 1,
                            "maxTileRow": 5,
                            "minTileCol": 5,
                            "maxTileCol": 15
                          },
                          "4": {
                            "minTileRow": 3,
                            "maxTileRow": 10,
                            "minTileCol": 10,
                            "maxTileCol": 30
                          },
                          "5": {
                            "minTileRow": 6,
                            "maxTileRow": 20,
                            "minTileCol": 20,
                            "maxTileCol": 61
                          },
                          "6": {
                            "minTileRow": 13,
                            "maxTileRow": 40,
                            "minTileCol": 41,
                            "maxTileCol": 123
                          },
                          "7": {
                            "minTileRow": 27,
                            "maxTileRow": 80,
                            "minTileCol": 82,
                            "maxTileCol": 247
                          },
                          "8": {
                            "minTileRow": 54,
                            "maxTileRow": 160,
                            "minTileCol": 164,
                            "maxTileCol": 494
                          },
                          "9": {
                            "minTileRow": 108,
                            "maxTileRow": 321,
                            "minTileCol": 329,
                            "maxTileCol": 989
                          },
                          "10": {
                            "minTileRow": 216,
                            "maxTileRow": 642,
                            "minTileCol": 659,
                            "maxTileCol": 1979
                          },
                          "11": {
                            "minTileRow": 432,
                            "maxTileRow": 1285,
                            "minTileCol": 1319,
                            "maxTileCol": 3959
                          }
                        }
                }
            });

        this.addElevationLayer({
            protocol:   "wmts",
            id:         "IGN_MNT_HIGHRES",
            url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
            noDataValue : -99999,
            wmtsOptions: {
                    name: "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES",
                    mimetype: "image/x-bil;bits=32",
                    tileMatrixSet: "PM",
                    tileMatrixSetLimits: {
                          "6": {
                            "minTileRow": 13,
                            "maxTileRow": 36,
                            "minTileCol": 62,
                            "maxTileCol": 80
                          },
                          "7": {
                            "minTileRow": 27,
                            "maxTileRow": 73,
                            "minTileCol": 124,
                            "maxTileCol": 160
                          },
                          "8": {
                            "minTileRow": 55,
                            "maxTileRow": 146,
                            "minTileCol": 248,
                            "maxTileCol": 320
                          },
                          "9": {
                            "minTileRow": 110,
                            "maxTileRow": 292,
                            "minTileCol": 497,
                            "maxTileCol": 640
                          },
                          "10": {
                            "minTileRow": 221,
                            "maxTileRow": 585,
                            "minTileCol": 994,
                            "maxTileCol": 1281
                          },
                          "11": {
                            "minTileRow": 442,
                            "maxTileRow": 1171,
                            "minTileCol": 1989,
                            "maxTileCol": 2563
                          },
                          "12": {
                            "minTileRow": 885,
                            "maxTileRow": 2343,
                            "minTileCol": 3978,
                            "maxTileCol": 5126
                          },
                          "13": {
                            "minTileRow": 1770,
                            "maxTileRow": 4687,
                            "minTileCol": 7957,
                            "maxTileCol": 10253
                          },
                          "14": {
                            "minTileRow": 3540,
                            "maxTileRow": 9375,
                            "minTileCol": 15914,
                            "maxTileCol": 20507
                          }
                        }
                }
            });

        //!\\ TEMP
        this.scene.wait(0);
        //!\\ TEMP

        return this.scene;

    };

    ApiGlobe.prototype.setLayerAtLevel = function(baseurl,layer/*,level*/) {
 // TODO CLEAN AND GENERIC
        var wmtsProvider = new WMTS_Provider({url:baseurl, layer:layer});
        this.scene.managerCommand.providerMap[4] = wmtsProvider;
        this.scene.managerCommand.providerMap[5] = wmtsProvider;
        this.scene.managerCommand.providerMap[this.scene.layers[0].node.meshTerrain.id].providerWMTS = wmtsProvider;
        this.scene.browserScene.updateNodeMaterial(wmtsProvider);
        this.scene.renderScene3D();
    };

    ApiGlobe.prototype.showClouds = function(value) {

        this.scene.layers[0].node.showClouds(value);
    };

    ApiGlobe.prototype.setRealisticLightingOn = function(value) {

        this.scene.gfxEngine.setLightingOn(value);
        this.scene.layers[0].node.setRealisticLightingOn(value);
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

        var controlCam = this.scene.currentControls();
        var ellipsoid = this.scene.getEllipsoid();
        var ray = controlCam.getRay();

        var intersection = ellipsoid.intersection(ray);

        // var center = controlCam.globeTarget.position;
        var camPosition = this.scene.currentCamera().position();
        // var range = center.distanceTo(camPosition);
        var range = intersection.distanceTo(camPosition);

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
       // console.log(this.getRange());
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

        this.scene.layers[0].node.showKML(value);
        this.scene.renderScene3D();
    };


    return ApiGlobe;

});
