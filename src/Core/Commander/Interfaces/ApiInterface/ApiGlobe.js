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
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';
import Ellipsoid from 'Core/Math/Ellipsoid';
import Projection from 'Core/Geographic/Projection';
import CustomEvent from 'custom-event';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import WFS_Provider from 'Core/Commander/Providers/WFS_Provider';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Scene/LayerUpdateStrategy';

var loaded = false;
var eventLoaded = new CustomEvent('globe-loaded');
var eventRange = new CustomEvent('rangeChanged');
var eventCenter = new CustomEvent('centerchanged');
var eventOrientation = new CustomEvent('orientationchanged');
var eventLayerAdded = new CustomEvent('layeradded');
var eventLayerRemoved = new CustomEvent('layerremoved');
var eventLayerChanged = new CustomEvent('layerchanged');
var eventLayerChangedVisible = new CustomEvent('layerchanged:visible');
var eventLayerChangedOpacity = new CustomEvent('layerchanged:opacity');
var eventLayerChangedIndex = new CustomEvent('layerchanged:index');
var eventError = new CustomEvent('error');

function ApiGlobe() {
    // Constructor
    this.scene = null;
    this.commandsTree = null;
    this.projection = new Projection();
    this.viewerDiv = null;
}

ApiGlobe.prototype.constructor = ApiGlobe;

/**
 * @param Command
 */
ApiGlobe.prototype.add = function (/* Command*/) {
    // TODO: Implement Me

};

/**
 * @param commandTemplate
 */
ApiGlobe.prototype.createCommand = function (/* commandTemplate*/) {
    // TODO: Implement Me

};

/**
 */
ApiGlobe.prototype.execute = function () {
    // TODO: Implement Me

};

ApiGlobe.prototype.getProtocolProvider = function (protocol) {
    return this.scene.managerCommand.getProtocolProvider(protocol);
};

/**
 * This function gives a chance to the matching provider to pre-process some
 * values for a layer.
 */
function preprocessLayer(layer, provider) {
    if (!layer.updateStrategy) {
        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
        };
    }

    if (provider.preprocessDataLayer) {
        layer.tileInsideLimit = provider.tileInsideLimit.bind(provider);
        provider.preprocessDataLayer(layer);
    }
}

/**
 * Init the geometry layer of the Scene.
 */
ApiGlobe.prototype.init = function () {
    const map = this.scene.getMap();
    map.tiles.init(map.layersConfiguration.getGeometryLayers()[0]);
};

/**
 * Add the geometry layer to the scene.
 */
ApiGlobe.prototype.addGeometryLayer = function (layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));
    const map = this.scene.getMap();
    map.layersConfiguration.addGeometryLayer(layer);
};

/**
 * This function adds an imagery layer to the scene. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 */
ApiGlobe.prototype.addImageryLayer = function (layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();

    map.layersConfiguration.addColorLayer(layer);
    this.viewerDiv.dispatchEvent(eventLayerAdded);
};

ApiGlobe.prototype.addFeatureLayer = function (layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();
    map.layersConfiguration.addGeometryLayer(layer);
    var featureLayer = map.createFeatureLayer(layer.id);
    this.scene.gfxEngine.add3DScene(featureLayer.getMesh());
};

/**
 * This function adds an imagery layer to the scene using a JSON file. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 * @return     {layer}  The Layer.
 */

ApiGlobe.prototype.addImageryLayerFromJSON = function (url) {
    return Fetcher.json(url).then((result) => {
        this.addImageryLayer(result);
    });
};

/**
 * This function adds an imagery layer to the scene using an array of JSON files. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layers} array - An array of JSON files.
 * @return     {layer}  The Layers.
 */

ApiGlobe.prototype.addImageryLayersFromJSONArray = function (urls) {
    var proms = [];

    for (var i = 0; i < urls.length; i++) {
        proms.push(Fetcher.json(urls[i]).then(this.addImageryLayer.bind(this)));
    }

    return Promise.all(proms).then(() => this.scene.getMap().layersConfiguration.getColorLayers());
};

ApiGlobe.prototype.moveLayerUp = function (layerId) {
    this.scene.getMap().layersConfiguration.moveLayerUp(layerId);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerDown = function (layerId) {
    this.scene.getMap().layersConfiguration.moveLayerDown(layerId);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

/**
 * Moves a specific layer to a specific index in the layer list. This function has no effect if the layer is moved to its current index.
 * @constructor
 * @param      {string}  layerId   The layer's idendifiant
 * @param      {number}  newIndex   The new index
 */
ApiGlobe.prototype.moveLayerToIndex = function (layerId, newIndex) {
    this.scene.getMap().layersConfiguration.moveLayerToIndex(layerId, newIndex);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
    eventLayerChangedIndex.layerIndex = newIndex;
    eventLayerChangedIndex.layerId = layerId;
    this.viewerDiv.dispatchEvent(eventLayerChangedIndex);
};

/**
 * Removes a specific imagery layer from the current layer list. This removes layers inserted with addLayer().
 * @constructor
 * @param      {string}   id      The identifier
 * @return     {boolean}  { description_of_the_return_value }
 */
ApiGlobe.prototype.removeImageryLayer = function (id) {
    if (this.scene.getMap().layersConfiguration.removeColorLayer(id)) {
        this.scene.getMap().removeColorLayer(id);
        this.scene.renderScene3D();
        eventLayerRemoved.layer = id;
        this.viewerDiv.dispatchEvent(eventLayerRemoved);
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

ApiGlobe.prototype.addElevationLayer = function (layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();
    map.layersConfiguration.addElevationLayer(layer);
    this.viewerDiv.dispatchEvent(eventLayerAdded);
};

/**
 * Add an elevation layer to the map using a JSON file.
 * Elevations layers are used to build the terrain.
 * Only one elevation layer is used, so if multiple layers cover the same area, the one
 * with best resolution is used (or the first one is resolution are identical).
 * The layer id must be unique amongst all layers already inserted.
 * The protocol rules which parameters are then needed for the function.
 * @constructor
 * @param {Layers} array - An array of JSON files.
* @return     {layer}  The Layers.
 */

ApiGlobe.prototype.addElevationLayersFromJSON = function (url) {
    return Fetcher.json(url).then((result) => {
        this.addElevationLayer(result);
    });
};

/**
 * Add an elevation layer to the map using an array of JSON files.
 * Elevations layers are used to build the terrain.
 * Only one elevation layer is used, so if multiple layers cover the same area, the one
 * with best resolution is used (or the first one is resolution are identical).
 * The layer id must be unique amongst all layers already inserted.
 * The protocol rules which parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 * @return     {layer}  The Layers.
 */

ApiGlobe.prototype.addFeature = function (options) {
    if (options === undefined)
        { throw new Error('options is required'); }
    var map = this.scene.getMap();
    map.addFeature(options);
};

ApiGlobe.prototype.addElevationLayersFromJSONArray = function (urls) {
    var proms = [];

    for (var i = 0; i < urls.length; i++) {
        proms.push(Fetcher.json(urls[i]).then(this.addElevationLayer.bind(this)));
    }

    return Promise.all(proms).then(() => this.scene.getMap().layersConfiguration.getElevationLayers());
};

/**
 * Gets the minimum zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/66r8ugq0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {index} index - The index of the layer.
 * @return     {number}  The min of the level.
 */
ApiGlobe.prototype.getMinZoomLevel = function (index) {
    var layer = this.getImageryLayers()[index];
    if (layer && layer.zoom) {
        return layer.zoom.min;
    } else {
        var layers = this.getImageryLayers();
        let min = Infinity;
        for (var i = layers.length - 1; i >= 0; i--) {
            if (layers[i].zoom) {
                min = Math.min(min, layers[i].zoom.min);
            }
        }
        return min;
    }
};


ApiGlobe.prototype.pickFeature = function (Position, layerId) {
    if (Position == undefined)
        { throw new Error('Position is required'); }
    var map = this.scene.getMap();
    var layer = map.getFeatureLayerByName(layerId);
    return this.scene.getPickFeature(Position, layer);
};

ApiGlobe.prototype.removeFeature = function (feature) {
    var featureId = feature.featureId;
    var layerId = feature.layerId;
    var map = this.scene.getMap();
    var layer = map.getFeatureLayerByName(layerId);
    layer.removeFeature(featureId);
};


/**
 * Gets the maximun zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/y1xcqv4s/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {index} index - The index of the layer.
 * @return     {number}  The max of the level.
 */
ApiGlobe.prototype.getMaxZoomLevel = function (index) {
    var layer = this.getImageryLayers()[index];
    if (layer && layer.zoom) {
        return layer.zoom.max;
    } else {
        var layers = this.getImageryLayers();
        let max = 0;
        for (var i = layers.length - 1; i >= 0; i--) {
            if (layers[i].zoom) {
                max = Math.max(max, layers[i].zoom.max);
            }
        }
        return max;
    }
};

/**
 * Return the list of all layers in the scene in the order of how they are stacked on top of each other.
 * @constructor
 * @return     {layer}  The Layers.
 */
ApiGlobe.prototype.getImageryLayers = function () {
    var map = this.scene.getMap();
    return map.layersConfiguration.getColorLayers();
};

/**
 * Creates the scene (the globe of iTowns).
 * The first parameter is the coordinates on wich the globe will be centered at the initialization.
 * The second one is the HTML div in wich the scene will be created.
 * @constructor
 * @param {Coords} coords.
 * @params {Div} string.
 */

ApiGlobe.prototype.createSceneGlobe = function (coordCarto, viewerDiv) {
    // TODO: Normalement la creation de scene ne doit pas etre ici....
    // Deplacer plus tard

    this.viewerDiv = viewerDiv;

    viewerDiv.addEventListener('globe-built', () => {
        if (loaded == false) {
            loaded = true;
            viewerDiv.dispatchEvent(eventLoaded);
        } else {
            viewerDiv.dispatchEvent(eventError);
        }
    }, false);

    var gLDebug = false; // true to support GLInspector addon
    var debugMode = false;

    // gLDebug = true; // true to support GLInspector addon
    // debugMode = true;

    var ellipsoid = new Ellipsoid({
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137,
    });

    var coordinate = new GeoCoordinate().copy(coordCarto, UNIT.DEGREE);

    this.scene = Scene(coordinate, ellipsoid, viewerDiv, debugMode, gLDebug);

    var map = new Globe(ellipsoid, gLDebug);

    this.scene.add(map);

    // Register all providers
    var wmtsProvider = new WMTS_Provider({
        support: map.gLDebug,
    });

    this.scene.managerCommand.addProtocolProvider('wmts', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('wmtsc', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('tile', new TileProvider(ellipsoid));
    this.scene.managerCommand.addProtocolProvider('wms', new WMS_Provider({ support: map.gLDebug }));
    this.scene.managerCommand.addProtocolProvider('wfs', new WFS_Provider());

    return this.scene;
};

ApiGlobe.prototype.update = function () {
    this.scene.notifyChange();
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

ApiGlobe.prototype.showClouds = function (value, satelliteAnimation) {
    this.scene.getMap().showClouds(value, satelliteAnimation);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setRealisticLightingOn = function (value) {
    this.scene.setLightingPos();
    this.scene.gfxEngine.setLightingOn(value);
    this.scene.getMap().setRealisticLightingOn(value);
    this.scene.browserScene.updateMaterialUniform('lightingOn', value ? 1 : 0);
    this.scene.renderScene3D();
};

/**
 * Sets the visibility of a layer. If the layer is not visible in the scene, this function will no effect until the camera looks at the layer.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerVisibility = function (id, visible) {
    this.scene.getMap().setLayerVisibility(id, visible);
    this.update();
    eventLayerChangedVisible.layerId = id;
    eventLayerChangedVisible.visible = visible;
    this.viewerDiv.dispatchEvent(eventLayerChangedVisible);
};

ApiGlobe.prototype.animateTime = function (value) {
    this.scene.animateTime(value);
};

ApiGlobe.prototype.orbit = function (value) {
    this.scene.orbit(value);
};

/**
 * Sets the opacity of a layer. If the layer is not visible in the scene, this function will no effect until the layer becomes visible.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerOpacity = function (id, opacity) {
    this.scene.getMap().setLayerOpacity(id, opacity);
    this.scene.renderScene3D();
    eventLayerChangedOpacity.layerId = id;
    eventLayerChangedOpacity.opacity = opacity;
    this.viewerDiv.dispatchEvent(eventLayerChangedOpacity);
};

ApiGlobe.prototype.setStreetLevelImageryOn = function (value) {
    this.scene.setStreetLevelImageryOn(value);
};

/**
 * Returns the orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/okfj460p/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */
ApiGlobe.prototype.getCameraOrientation = function () {
    var tiltCam = this.scene.currentControls().getTilt();
    var headingCam = this.scene.currentControls().getHeading();
    return [tiltCam, headingCam];
};

/**
 * Returns the camera location projected on the ground in lat,lon.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/mjv7ha02/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCameraLocation = function () {
    var cam = this.scene.currentCamera().camera3D;
    return this.projection.cartesianToGeo(cam.position);
};

/**
 * Retuns the coordinates of the central point on screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/4tjgnv7z/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCenter = function () {
    var controlCam = this.scene.currentControls();
    return this.projection.cartesianToGeo(controlCam.getTargetCameraPosition());
};

/**
 * Sets orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/9qr2mogh/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Orientation} Param - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.setCameraOrientation = function (orientation /* param,pDisableAnimationopt*/) {
    this.setHeading(orientation.heading);
    this.setTilt(orientation.tilt);
    this.viewerDiv.dispatchEvent(eventOrientation);
};

/**
 * Pick a position on the globe at the given position.
 * @constructor
 * @param {Number | MouseEvent} x|event - The x-position inside the Globe element or a mouse event.
 * @param {number | undefined} y - The y-position inside the Globe element.
 * @return {Position} postion
 */
ApiGlobe.prototype.pickPosition = function (mouse, y) {
    if (mouse)
        { if (mouse.clientX) {
            mouse.x = mouse.clientX;
            mouse.y = mouse.clientY;
        } else {
            mouse.x = mouse;
            mouse.y = y;
        } }

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

ApiGlobe.prototype.getTilt = function () {
    var tiltCam = this.scene.currentControls().getTilt();
    return tiltCam;
};

/**
 * Returns the heading in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/pxv1Lw16/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getHeading = function () {
    var headingCam = this.scene.currentControls().getHeading();
    return headingCam;
};

/**
 * Returns the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lbt1vfek/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Number} number
 */

ApiGlobe.prototype.getRange = function () {
    return this.scene.currentControls().getRange();
};

ApiGlobe.prototype.getRangeFromEllipsoid = function () {
    // TODO: error is distance is big with ellipsoid.intersection(ray) because d < 0
    var controlCam = this.scene.currentControls();
    var ellipsoid = this.scene.getEllipsoid();
    var ray = controlCam.getRay();
    var intersection = ellipsoid.intersection(ray);
    var camPosition = this.scene.currentCamera().position();
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

ApiGlobe.prototype.setTilt = function (tilt /* , bool*/) {
    eventOrientation.oldTilt = this.getTilt();
    this.scene.currentControls().setTilt(tilt);
    this.viewerDiv.dispatchEvent(eventOrientation);
};

/**
 * Change the heading.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/rxe4xgxj/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setHeading = function (heading /* , bool*/) {
    eventOrientation.oldHeading = this.getHeading();
    this.scene.currentControls().setHeading(heading);
    this.viewerDiv.dispatchEvent(eventOrientation);
};

/**
 * Resets camera tilt -> sets the tilt to 0°.
 * @constructor
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.resetTilt = function (/* bool*/) {
    this.scene.currentControls().setTilt(0);
    this.viewerDiv.dispatchEvent(eventOrientation);
};

/**
 * Resets camera heading -> sets the heading to 0°.
 * @constructor
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.resetHeading = function (/* bool*/) {
    this.scene.currentControls().setHeading(0);
    this.viewerDiv.dispatchEvent(eventOrientation);
};

/**
 * Returns the distance in meter between two geographic positions.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/0nLhws5u/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} First - Position.
 * @param {Position} Second - Position.
 * @return {Number} distance
 */

ApiGlobe.prototype.computeDistance = function (p1, p2) {
    return this.scene.getEllipsoid().computeDistance(new GeoCoordinate().copy(p1), new GeoCoordinate().copy(p2));
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/x06yhbq6/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {coordinates} coordinates - Properties : longitude and latitude
 */
ApiGlobe.prototype.setCenter = function (coordinates) {
    eventCenter.oldCenter = this.getCenter();
    var position3D = this.scene.getEllipsoid().cartographicToCartesian(new GeoCoordinate(coordinates.longitude, coordinates.latitude, 0, UNIT.DEGREE));
    this.scene.currentControls().setCenter(position3D);
    this.viewerDiv.dispatchEvent(eventCenter);
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

ApiGlobe.prototype.setCenterAdvanced = function (pPosition /* , pDisableAnimationopt*/) {
    this.setCenter(pPosition.position);
    this.setRange(pPosition.range);
    this.setHeading(pPosition.heading);
    this.setTilt(pPosition.tilt);
};

var updateTargetCamera = function (api) {
    api.scene.currentControls().updateCameraTransformation();
    api.viewerDiv.dispatchEvent(eventRange);
    api.removeEventListener('globe-loaded', updateTargetCamera);
};
/**
 * Sets the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lt3jL5pd/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Number} pRange - The camera altitude.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */
ApiGlobe.prototype.setRange = function (pRange /* , bool anim*/) {
    eventRange.oldRange = this.getRange();
    loaded = false;
    this.scene.currentControls().setRange(pRange);
    this.addEventListener('globe-loaded', updateTargetCamera(this));
};

/**
 * Displaces the central point to a specific amount of pixels from its current position.
 * The view flies to the desired coordinate, i.e.is not teleported instantly. Note : The results can be strange in some cases, if ever possible, when e.g.the camera looks horizontally or if the displaced center would not pick the ground once displaced.
 * @constructor
 * @param      {vector}  pVector  The vector
 */
ApiGlobe.prototype.pan = function (pVector) {
    this.scene.currentControls().pan(pVector.x, pVector.y);
};

/**
 * Returns the actual zoom level. The level will always be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * @constructor
 * @return     {number}  The zoom level.
 */
ApiGlobe.prototype.getZoomLevel = function () {
    return this.scene.getMap().getZoomLevel();
};

/**
 * Gets the current zoom level, which is an index in the logical scales predefined for the application.
 * The higher the level, the closer to the ground.
 * The level is always in the [getMinZoomLevel(), getMaxZoomLevel()] range.
 * @constructor
 * @param      {number}  zoom    The zoom
 */
ApiGlobe.prototype.setZoomLevel = function (zoom) {
    zoom = Math.max(this.getMinZoomLevel(), zoom);
    zoom = Math.min(this.getMaxZoomLevel(), zoom);
    const distance = this.scene.getMap().computeDistanceForZoomLevel(zoom, this.scene.currentCamera());
    this.setRange(distance);
};

/**
 * Return the current zoom scale at the central point of the view.
 * This function compute the scale of a map
 * @constructor
 * @param      {number}  pitch   Screen pitch, in millimeters ; 0.28 by default
 * @return     {number}  The zoom scale.
 */
ApiGlobe.prototype.getZoomScale = function (pitch) {
    // TODO: Why error div size height in Chrome?
    // Screen pitch, in millimeters
    pitch = (pitch || 0.28) / 1000;

    // To compute scale, we must to calculate the maximum vertical distance (in meter) perceived by the camera
    // the maximum vertical distance 2xHS (look at the explanations below 'HS segment')
    // There's two state
    //     * Globe is inside the frustrum camera
    //     * Globe intersects with the frustrum camera
    const camera = this.scene.currentCamera();
    const center = this.scene.currentControls().getTargetCameraPosition();
    const rayon = center.length();
    const range = center.distanceTo(camera.camera3D.position);
    // compute distance camera/globe's center
    const distance = rayon + range;
    // Three points C,G and S
    // C : Camera's position
    // G : Globe's center
    // S : The furthest interesection[camera verical frustrum, globe surface] from line CG
    // HS is triangle CSG's altitude going through S and H is in GC segment
    // alpha is angle GCS
    // phi is angle CSG
    const alpha = camera.FOV / 180 * Math.PI * 0.5;
    const phi = Math.PI - Math.asin(distance / rayon * Math.sin(alpha));
    // projection is projection segment HS on camera
    let projection;

    if (isNaN(phi)) {
        // Globe is inside the frustrum camera
        projection = distance * 2 * Math.tan(alpha);
    } else {
        // Globe intersects with the frustrum camera

        // develop operation
        // {
        //     var beta = Math.PI - ( phi + alpha);
        //     projection = rayon * Math.sin(beta) * 2.0;
        // }
        // factorisation ->
        projection = 2.0 * rayon * Math.sin(phi + alpha);
    }

    const zoomScale = camera.height * pitch / projection;

    return zoomScale;
};

/**
 * Changes the zoom level of the central point of screen so that screen acts as a map with a specified scale.
 *  The view flies to the desired zoom scale;
 * @constructor
 * @param      {number}  zoomScale  The zoom scale
 * @param      {number}  pitch      The pitch
 */
ApiGlobe.prototype.setZoomScale = function (zoomScale, pitch) {
    // Screen pitch, in millimeters
    pitch = (pitch || 0.28) / 1000;

    // To set scale, we must to calculate the maximum vertical distance (in meter) perceived by the camera
    // the maximum vertical distance 2xHS (look at the explanations below 'HS segment')
    // projection is projection segment HS on camera
    // There's two state
    //     * Globe is inside the frustrum camera
    //     * Globe intersects with the frustrum camera

    const camera = this.scene.currentCamera();
    const projection = camera.height * pitch / zoomScale;
    const rayon = this.scene.currentControls().getTargetCameraPosition().length();
    const alpha = camera.FOV / 180 * Math.PI * 0.5;
    // distance camera/globe's center
    let distance;
    // Three points C,G and S
    // C camera's position
    // G globe's center
    // S = the furthest interesection[camera verical frustrum, globe surface] from line CG
    // HS is triangle CSG's altitude going through S and H is in GC segment
    // alpha is angle GCS
    // phi is angle CSG
    // beta is angle SGC
    const sinBeta = projection / (2 * rayon);

    if (sinBeta < 1.0) {
        // Globe is inside the frustrum camera
        const beta = Math.asin(sinBeta);
        // develop operation
        //  {
        //      let phi = Math.PI - ( beta + alpha);
        //      distance  = rayon * Math.sin(phi) / Math.sin(alpha) ;
        //  }
        //  factorisation ->
        distance = rayon * Math.sin(beta + alpha) / Math.sin(alpha);
    } else {
        // Globe is inside the frustrum camera
        distance = rayon / Math.tan(alpha) * sinBeta;
    }

    const range = distance - rayon;
    this.setRange(range);
};

/**
 * Some event return the old value before the change. The available events are centerchanged, zoomchanged, orientationchanged, layerchanged:opacity, layerchanged:visible, layerchanged:ipr and layerchanged:index.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

ApiGlobe.prototype.addEventListener = function (eventname, callback) {
    if (eventname == 'layerchanged') {
        this.viewerDiv.addEventListener('layerchanged', callback, false);
        this.addEventListenerLayerChanged();
    } else {
        this.viewerDiv.addEventListener(eventname, callback, false);
    }
};

ApiGlobe.prototype.addEventListenerLayerChanged = function () {
    this.viewerDiv.addEventListener('layerchanged:visible', this.callbackLayerChanged, false);
    this.viewerDiv.addEventListener('layerchanged:opacity', this.callbackLayerChanged, false);
    this.viewerDiv.addEventListener('layerchanged:index', this.callbackLayerChanged, false);
};

ApiGlobe.prototype.callbackLayerChanged = function () {
    this.dispatchEvent(eventLayerChanged);
};

/**
 * Remove the event of events listener from the event target.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

ApiGlobe.prototype.removeEventListener = function (eventname, callback) {
    if (eventname == 'layerchanged') {
        this.viewerDiv.removeEventListener('layerchanged', callback, false);
        this.removeEventListenerLayerChanged();
    } else {
        this.viewerDiv.removeEventListener(eventname, callback, false);
    }
};

ApiGlobe.prototype.removeEventListenerLayerChanged = function () {
    this.viewerDiv.removeEventListener('layerchanged:visible', this.callbackLayerChanged, false);
    this.viewerDiv.removeEventListener('layerchanged:opacity', this.callbackLayerChanged, false);
    this.viewerDiv.removeEventListener('layerchanged:index', this.callbackLayerChanged, false);
};

ApiGlobe.prototype.launchCommandApi = function () {

    // this.removeImageryLayer('ScanEX');

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
    //        var p1 = new GeoCoordinate(2.4347047,48.8472568,0);
    //        var p2 = new GeoCoordinate(2.4345599,48.8450221,0);
    //        console.log(this.computeDistance({longitude:2.4347047,latitude:48.8472568,altitude:0},{longitude:2.4345599,latitude:48.8450221,altitude:0}));

    // var p = new GeoCoordinate(-74.0059700 ,40.7142700,0); //NY

    //        var p = new GeoCoordinate(coordCarto.lon, coordCarto.lat, coordCarto.alt,UNIT.DEGREE)
    //        var p = new GeoCoordinate(2,20,0,UNIT.DEGREE); //NY
    //
    //        this.setCenter(p);
    //        var p2 = new GeoCoordinate().setFromDegree(2.4347047,48.8472568,0); //Paris
    //        this.setCenter(p2);
    //        this.setCenter({lon:-74,lat:40, alt:0});
    //        this.testTilt();
    //        this.testHeading();
    // console.log("range 1  " + this.getRange());
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

ApiGlobe.prototype.selectNodeById = function (id) {
    this.scene.selectNodeId(id);
    this.scene.update();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.showFeature = function (value) {
    this.scene.getMap().showFeature(value);
    this.scene.renderScene3D();
};


ApiGlobe.prototype.loadGPX = function (url) {
    loadGpx(url, this.scene.getEllipsoid()).then((gpx) => {
        if (gpx) {
            this.scene.getMap().gpxTracks.children[0].add(gpx);
        }
    });

    this.scene.renderScene3D();
};


export default ApiGlobe;
