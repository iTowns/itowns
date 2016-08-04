/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */



import Scene from 'Scene/Scene';
import Globe from 'Globe/Globe';
import WMTS_Provider from 'Core/Commander/Providers/WMTS_Provider';
import WMS_Provider from 'Core/Commander/Providers/WMS_Provider';
import TileProvider from 'Core/Commander/Providers/TileProvider';
import loadGpx from 'Core/Commander/Providers/GpxUtils';
import CoordCarto from 'Core/Geographic/CoordCarto';
import Ellipsoid from 'Core/Math/Ellipsoid';
import Projection from 'Core/Geographic/Projection';
import CustomEvent from 'custom-event';

var loaded = false;
var eventLoaded = new CustomEvent('globe-loaded');
var eventLayerRemoved = new CustomEvent('Layer-removed');
var eventRange = new CustomEvent('rangeChanged');

function ApiGlobe() {
    //Constructor

    this.scene = null;
    //        this.nodeProcess = null;
    this.commandsTree = null;
    this.projection = new Projection();
    this.viewerDiv = null;

}

ApiGlobe.prototype.constructor = ApiGlobe;

//    var event = new Event('empty');
//    document.addEventListener('empty', console.log('Your turn'));
//    document.dispatchEvent(event);

/**
 * @param Command
 */
ApiGlobe.prototype.add = function( /*Command*/ ) {
    //TODO: Implement Me

};


/**
 * @param commandTemplate
 */
ApiGlobe.prototype.createCommand = function( /*commandTemplate*/ ) {
    //TODO: Implement Me

};

/**
 */
ApiGlobe.prototype.execute = function() {
    //TODO: Implement Me

};

ApiGlobe.prototype.getProtocolProvider = function(protocol) {
    return this.scene.managerCommand.getProtocolProvider(protocol);
}

/**
 * This function gives a chance to the matching provider to pre-process some
 * values for a layer.
 */
function preprocessLayer(layer, provider) {
    if (provider.preprocessDataLayer) {
        layer.tileInsideLimit = provider.tileInsideLimit.bind(provider);
        provider.preprocessDataLayer(layer);
    }
}

/**
 * This function adds an imagery layer to the scene. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 */
ApiGlobe.prototype.addImageryLayer = function(layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();

    map.layersConfiguration.addColorLayer(layer);
};

ApiGlobe.prototype.moveLayerUp = function(layer) {

    this.scene.getMap().layersConfiguration.moveLayerUp(layer);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerDown = function(layer) {

    this.scene.getMap().layersConfiguration.moveLayerDown(layer);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerToIndex = function(layer, newId) {
    this.scene.getMap().layersConfiguration.moveLayerToIndex(layer, newId);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.removeImageryLayer = function(id) {

    if (this.scene.getMap().removeColorLayer(id)) {
        eventLayerRemoved.layer = id;
        this.viewerDiv.dispatchEvent(eventLayerRemoved);
        this.scene.getMap().updateLayersOrdering();
        this.scene.renderScene3D();
        return true;
    }

    return false;
};


/**
 * Add an elevation layer to the map. Elevations layers are used to build the terrain.
 * Only one elevation layer is used, so if multiple layers cover the same area, the one
 * with best resolution is used (or the first one is resolution are identical).
 * The layer id must be unique amongst all layers already inserted.
 * The protocol rules which parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 */

ApiGlobe.prototype.addElevationLayer = function(layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();
    map.layersConfiguration.addElevationLayer(layer);
};

/**
 * Gets the minimum zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/66r8ugq0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {id} id - The id of the layer.
 */

ApiGlobe.prototype.getMinZoomLevel = function(id) {
    //console.log(this.addImageryLayer().id);
    var map = this.scene.getMap();
    var manager = this.scene.managerCommand;
    var providerWMTS = manager.getProvider(map.tiles).providerWMTS;
    var layerWMTS = providerWMTS.layersData;
    return layerWMTS[id].zoom.min;
};

/**
 * Return the list of all layers in the scene in the order of how they are stacked on top of each other.
 * @constructor
 * @param {id} id - The id of the layer.
 */

ApiGlobe.prototype.getLayers = function( /*param*/ ) {
    var map = this.scene.getMap();
    return map.layersConfiguration.getColorLayers();
};

/**
 * Gets the maximun zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/y1xcqv4s/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {id} id - The id of the layer.
 */

ApiGlobe.prototype.getMaxZoomLevel = function(id) {
    //console.log(this.addImageryLayer().id);
    var map = this.scene.getMap();
    var manager = this.scene.managerCommand;
    var providerWMTS = manager.getProvider(map.tiles).providerWMTS;
    var layerWMTS = providerWMTS.layersData;
    return layerWMTS[id].zoom.max;
};

/**
 * Creates the scene (the globe of iTowns).
 * The first parameter is the coordinates on wich the globe will be centered at the initialization.
 * The second one is the HTML div in wich the scene will be created.
 * @constructor
 * @param {Coords} coords.
 * @params {Div} string.
 */

ApiGlobe.prototype.createSceneGlobe = function(coordCarto, viewerDiv) {
    // TODO: Normalement la creation de scene ne doit pas etre ici....
    // Deplacer plus tard

    this.viewerDiv = viewerDiv;

    viewerDiv.addEventListener('globe-built', function() {

        if (loaded == false) {

            loaded = true;
            viewerDiv.dispatchEvent(eventLoaded);
        }
    }, false);

    var gLDebug = false; // true to support GLInspector addon
    var debugMode = false;

    //gLDebug = true; // true to support GLInspector addon
    //debugMode = true;

    var ellipsoid = new Ellipsoid({
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137
    });

    this.scene = Scene(coordCarto, ellipsoid, viewerDiv, debugMode, gLDebug);

    var map = new Globe(ellipsoid, gLDebug);

    this.scene.add(map);

    // Register all providers
    var wmtsProvider = new WMTS_Provider({
        support: map.gLDebug
    });
    this.scene.managerCommand.addProtocolProvider('wmts', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('wmtsc', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('tile', new TileProvider(ellipsoid));
    this.scene.managerCommand.addProtocolProvider('wms', new WMS_Provider({support : map.gLDebug}));

    var wgs84TileLayer = {
        protocol: 'tile',
        id: 'wgs84'
    };

    preprocessLayer(wgs84TileLayer, this.scene.managerCommand.getProtocolProvider(wgs84TileLayer.protocol));
    map.layersConfiguration.addGeometryLayer(wgs84TileLayer);

    map.tiles.init(map.layersConfiguration.getGeometryLayers()[0]);

    //!\\ TEMP
    //this.scene.wait(0);
    //!\\ TEMP

    return this.scene;

};

ApiGlobe.prototype.update = function() {

    //!\\ TEMP
    this.scene.wait(0);
    //!\\ TEMP

};

// ApiGlobe.prototype.setLayerAtLevel = function(baseurl,layer/*,level*/) {
//     // TODO CLEAN AND GENERIC
//     var wmtsProvider = new WMTS_Provider({url:baseurl, layer:layer});
//     this.scene.managerCommand.providerMap[4] = wmtsProvider;
//     this.scene.managerCommand.providerMap[5] = wmtsProvider;
//     this.scene.managerCommand.providerMap[this.scene.layers[0].node.meshTerrain.id].providerWMTS = wmtsProvider;
//     this.scene.browserScene.updateNodeMaterial(wmtsProvider);
//     this.scene.renderScene3D();
// };

ApiGlobe.prototype.showClouds = function(value, satelliteAnimation) {

    this.scene.getMap().showClouds(value, satelliteAnimation);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setRealisticLightingOn = function(value) {

    this.scene.setLightingPos();
    this.scene.gfxEngine.setLightingOn(value);
    this.scene.getMap().setRealisticLightingOn(value);
    this.scene.browserScene.updateMaterialUniform("lightingOn", value ? 1 : 0);
    this.scene.renderScene3D();
};

/**
 * Sets the visibility of a layer. If the layer is not visible in the scene, this function will no effect until the camera looks at the layer.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerVisibility = function(id, visible) {

    this.scene.getMap().setLayerVisibility(id, visible);

    this.scene.renderScene3D();
};

ApiGlobe.prototype.animateTime = function(value) {

    this.scene.animateTime(value);
};

ApiGlobe.prototype.orbit = function(value) {

    this.scene.orbit(value);
};

/**
 * Sets the opacity of a layer. If the layer is not visible in the scene, this function will no effect until the layer becomes visible.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerOpacity = function(id, visible) {

    this.scene.getMap().setLayerOpacity(id, visible);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setStreetLevelImageryOn = function(value) {

    this.scene.setStreetLevelImageryOn(value);
}

/**
 * Returns the orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/okfj460p/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */
ApiGlobe.prototype.getCameraOrientation = function() {

    var tiltCam = this.scene.currentControls().getTilt();
    var headingCam = this.scene.currentControls().getHeading();
    return [tiltCam, headingCam];
};

/**
 * Returns the camera location projected on the ground in lat,lon.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/mjv7ha02/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */

ApiGlobe.prototype.getCameraLocation = function() {
    var cam = this.scene.currentCamera().camera3D;
    return this.projection.cartesianToGeo(cam.position);
};

/**
 * Retuns the coordinates of the central point on screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/4tjgnv7z/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCenter = function() {

    var controlCam = this.scene.currentControls();
    return this.projection.cartesianToGeo(controlCam.globeTarget.position);
};

/**
 * Sets orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/9qr2mogh/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Orientation} Param - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.setCameraOrientation = function(orientation /*param,pDisableAnimationopt*/ ) {

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
ApiGlobe.prototype.pickPosition = function(mouse, y) {

    if (mouse)
        if (mouse.clientX) {
            mouse.x = mouse.clientX;
            mouse.y = mouse.clientY;
        } else {
            mouse.x = mouse;
            mouse.y = y;
        }

    var pickedPosition = this.scene.getPickPosition(mouse);

    this.scene.renderScene3D();

    return this.projection.cartesianToGeo(pickedPosition);
};

/**
 * Returns the tilt in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/kcx0of9j/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getTilt = function() {

    var tiltCam = this.scene.currentControls().getTilt();
    return tiltCam;
};

/**
 * Returns the heading in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/pxv1Lw16/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getHeading = function() {

    var headingCam = this.scene.currentControls().getHeading();
    return headingCam;
};

/**
 * Returns the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lbt1vfek/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Number} number
 */

ApiGlobe.prototype.getRange = function() {

    var controlCam = this.scene.currentControls();
    var ellipsoid = this.scene.getEllipsoid();
    var ray = controlCam.getRay();

    var intersection = ellipsoid.intersection(ray);

    //        var center = controlCam.globeTarget.position;
    var camPosition = this.scene.currentCamera().position();
    // var range = center.distanceTo(camPosition);
    var range = intersection.distanceTo(camPosition);

    return range;
};

/**
 * Change the tilt.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/p6t76zox/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setTilt = function(tilt /*, bool*/ ) {

    this.scene.currentControls().setTilt(tilt);
};

/**
 * Change the heading.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/rxe4xgxj/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setHeading = function(heading /*, bool*/ ) {

    this.scene.currentControls().setHeading(heading);
};

/**
 * Resets camera tilt -> sets the tilt to 0°.
 * @constructor
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.resetTilt = function( /*bool*/ ) {

    this.scene.currentControls().setTilt(0);
};

/**
 * Resets camera heading -> sets the heading to 0°.
 * @constructor
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.resetHeading = function( /*bool*/ ) {

    this.scene.currentControls().setHeading(0);
};

/**
 * Returns the distance in meter between two geographic positions.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/0nLhws5u/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} First - Position.
 * @param {Position} Second - Position.
 */

ApiGlobe.prototype.computeDistance = function(p1, p2) {
    return this.scene.getEllipsoid().computeDistance(new CoordCarto().setFromDegreeGeo(p1.longitude, p1.latitude, p1.altitude), new CoordCarto().setFromDegreeGeo(p2.longitude, p2.latitude, p2.altitude));
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/x06yhbq6/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} position - The position on the scene.
 */

ApiGlobe.prototype.setCenter = function(position) {
    //        var position3D = this.scene.getEllipsoid().cartographicToCartesian(position);
    var position3D = this.scene.getEllipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(position.longitude, position.latitude, position.altitude));
    this.scene.currentControls().setCenter(position3D);
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * This function allows to change the central position, the zoom level, the range, the scale and the camera orientation at the same time.
 * The level has to be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * The zoom level and the scale can't be set at the same time.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/7yk0mpn0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} pPosition - The detailed position in the scene.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setCenterAdvanced = function(pPosition /*, pDisableAnimationopt*/ ) {
    this.setCenter(pPosition.position);
    this.setRange(pPosition.range);
    this.setHeading(pPosition.heading);
    this.setTilt(pPosition.tilt);
};

/**
 * Sets the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lt3jL5pd/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Number} pRange - The camera altitude.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setRange = function(pRange /*, bool*/ ) {
    var viewerDiv = document.getElementById("viewerDiv");

    this.scene.currentControls().setRange(pRange);
    viewerDiv.dispatchEvent(eventRange);
};

/**
 * Returns the actual zoom level. The level will always be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * @constructor
 * @param {Id} id - The id of a layer.
 */

ApiGlobe.prototype.getZoomLevel = function(id) {
    return this.scene.getMap().getZoomLevel(id);
};

ApiGlobe.prototype.launchCommandApi = function() {

    //this.removeImageryLayer('ScanEX');

    //        console.log(this.getMinZoomLevel("IGNPO"));
    //        console.log(this.getMaxZoomLevel("IGN_MNT"));
    //        console.log(this.getCenter());
    //        console.log(this.getCameraLocation());
    //        console.log(this.getCameraOrientation());
    //        console.log(this.getZoomLevel());
    //        console.log(this.pickPosition());
    //        console.log(this.getTilt());
    //        console.log(this.getHeading());
    //       console.log(this.getRange());
    //        this.setTilt(45);
    //        this.setHeading(180);
    //        this.resetTilt();
    //        this.resetHeading();
    //        var p1 = new CoordCarto(2.4347047,48.8472568,0);
    //        var p2 = new CoordCarto(2.4345599,48.8450221,0);
    //        console.log(this.computeDistance({longitude:2.4347047,latitude:48.8472568,altitude:0},{longitude:2.4345599,latitude:48.8450221,altitude:0}));

    //var p = new CoordCarto(-74.0059700 ,40.7142700,0); //NY

    //        var p = new CoordCarto().setFromDegreeGeo(coordCarto.lon, coordCarto.lat, coordCarto.alt))
    //        var p = new CoordCarto().setFromDegreeGeo(2,20,0); //NY
    //
    //        this.setCenter(p);
    //        var p2 = new CoordCarto().setFromDegreeGeo(2.4347047,48.8472568,0); //Paris
    //        this.setCenter(p2);
    //        this.setCenter({lon:-74,lat:40, alt:0});
    //        this.testTilt();
    //        this.testHeading();
    //console.log("range 1  " + this.getRange());
    //        this.setRange(1000);
    //        console.log(this.getRange());
    //        this.setCameraOrientation({heading:45,tilt:30});
    //        this.setCenterAdvanced({position:p2, /*range:10000,*/ heading:180, tilt:70});
};

//    ApiGlobe.prototype.testTilt = function (){
//        this.setTilt(45);
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

    this.scene.getMap().showKML(value);
    this.scene.renderScene3D();
};


ApiGlobe.prototype.loadGPX = function(url) {
    loadGpx(url, this.scene.getEllipsoid()).then(function(gpx){
        if(gpx) {
            this.scene.getMap().gpxTracks.children[0].add(gpx);
        }
    }.bind(this));

    this.scene.renderScene3D();
};


export default ApiGlobe;
