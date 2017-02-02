/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */

import CustomEvent from 'custom-event';
import { ImageryLayers } from '../../../Layer/Layer';
import { C } from '../../../Geographic/Coordinates';
import loadGpx from '../../Providers/GpxUtils';
import Fetcher from '../../Providers/Fetcher';
import { computeTileZoomFromDistanceCamera, computeDistanceCameraFromTileZoom } from '../../../../Process/GlobeTileProcessing';
import CoordStars from '../../../Geographic/CoordStars';
import GlobeView from '../../../Prefab/GlobeView';

var sceneIsLoaded = false;
export const INITIALIZED_EVENT = 'initialized';

var eventRange = new CustomEvent('rangeChanged');
var eventOrientation = new CustomEvent('orientationchanged');
var eventPan = new CustomEvent('panchanged');
var eventLayerAdded = new CustomEvent('layeradded');
var eventLayerRemoved = new CustomEvent('layerremoved');
var eventLayerChanged = new CustomEvent('layerchanged');
var eventLayerChangedVisible = new CustomEvent('layerchanged:visible');
var eventLayerChangedOpacity = new CustomEvent('layerchanged:opacity');
var eventLayerChangedIndex = new CustomEvent('layerchanged:index');

var enableAnimation = false;

const defer = function defer() {
    const deferedPromise = {};
    deferedPromise.promise = new Promise((resolve, reject) => {
        deferedPromise.resolve = resolve;
        deferedPromise.reject = reject;
    });
    return deferedPromise;
};

function ApiGlobe() {
    this.scene = null;
    this.viewerDiv = null;
}

ApiGlobe.prototype.constructor = ApiGlobe;

/**
 * The intellectual property rights
 * @typedef {Object} Attribution
 * @property {string} name
 * @property {string} url
 */

/**
 * Options to wms protocol
 * @typedef {Object} OptionsWms
 * @property {Attribution} attribution The intellectual property rights for the layer
 * @property {string} name
 * @property {string} mimetype
 */

/**
 * Options to wtms protocol
 * @typedef {Object} OptionsWmts
 * @property {Attribution} attribution The intellectual property rights for the layer
 * @property {string} name
 * @property {string} mimetype
 * @property {string} tileMatrixSet
 * @property {Array.<Object>} tileMatrixSetLimits The limits for the tile matrix set
 * @property {number} tileMatrixSetLimits.minTileRow Minimum row for tiles at the level
 * @property {number} tileMatrixSetLimits.maxTileRow Maximum row for tiles at the level
 * @property {number} tileMatrixSetLimits.minTileCol Minimum col for tiles at the level
 * @property {number} tileMatrixSetLimits.maxTileCol Maximum col for tiles at the level
 * @property {Object} [zoom]
 * @property {Object} [zoom.min] layer's zoom minimum
 * @property {Object} [zoom.max] layer's zoom maximum
 */

/**
 * Layer
 * @typedef {Object} Layer
 * @property {string} id Unique layer's id
 * @property {string} layer.protocol wmts and wms (wmtsc for custom deprecated)
 * @property {string} layer.url Base URL of the repository or of the file(s) to load
 * @property {Object} layer.updateStrategy strategy to load imagery files
 * @property {OptionsWmts|OptionsWms} layer.options WMTS or WMS options
 */
 /*
 * Add the geometry layer to the scene.
 */
ApiGlobe.prototype.addGeometryLayer = function addGeometryLayer(layer, parentLayer) {
    layer.protocol = 'tile';

    this.scene.attach(layer, parentLayer);
    layer.type = 'geometry';
    return layer;
};

/**
 * This function adds an imagery layer to the scene. The layer id must be unique.
 * The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} Layer
 */
ApiGlobe.prototype.addImageryLayer = function addImageryLayer(layer) {
    layer.type = 'color'
    ;
    this.globeview.addLayer(layer);
    layer.frozen = false;
    layer.visible = true;
    layer.opacity = 1.0;
    const colorLayerCount = this.globeview.getLayers(l => l.type === 'color').length;
    layer.sequence = colorLayerCount - 1;

    this.globeview.notifyChange(1, true);
    this.setSceneLoaded().then(() => {
        this.viewerDiv.dispatchEvent(eventLayerAdded);
    });

    return layer;
};

/**
 * This function adds an imagery layer to the scene using a JSON file. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 * @return     {layer}  The Layer.
 */

ApiGlobe.prototype.addImageryLayerFromJSON = function addImageryLayerFromJSON(url) {
    return Fetcher.json(url).then(result => this.addImageryLayer(result));
};

/**
 * This function adds an imagery layer to the scene using an array of JSON files. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layers} array - An array of JSON files.
 * @return     {layer}  The Layers.
 */
ApiGlobe.prototype.addImageryLayersFromJSONArray = function addImageryLayersFromJSONArray(urls) {
    const proms = [];

    for (const url of urls) {
        proms.push(Fetcher.json(url).then(layer => this.addImageryLayer(layer)));
    }

    return Promise.all(proms);
};

/**
 * Add an elevation layer to the map. Elevations layers are used to build the terrain.
 * Only one elevation layer is used, so if multiple layers cover the same area, the one
 * with best resolution is used (or the first one is resolution are identical).
 * The layer id must be unique amongst all layers already inserted.
 * The protocol rules which parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer
 */

ApiGlobe.prototype.addElevationLayer = function addElevationLayer(layer) {
    if (layer.protocol === 'wmts' && layer.options.tileMatrixSet !== 'WGS84G') {
        throw new Error('Only WGS84G tileMatrixSet is currently supported for WMTS elevation layers');
    }

    layer.type = 'elevation';

    this.globeview.addLayer(layer);
    layer.frozen = false;

    this.globeview.notifyChange(1, true);
    this.setSceneLoaded().then(() => {
        this.viewerDiv.dispatchEvent(eventLayerAdded);
    });

    return layer;
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

ApiGlobe.prototype.addElevationLayersFromJSON = function addElevationLayersFromJSON(url) {
    return Fetcher.json(url).then(result => this.addElevationLayer(result));
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

ApiGlobe.prototype.addElevationLayersFromJSONArray = function addElevationLayersFromJSONArray(urls) {
    var proms = [];

    for (const url of urls) {
        proms.push(Fetcher.json(url).then(layer => this.addElevationLayer(layer)));
    }

    return Promise.all(proms);
};

function updateLayersOrdering(geometryLayer, imageryLayers) {
    var sequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);

    var cO = function cO(object) {
        if (object.changeSequenceLayers)
            { object.changeSequenceLayers(sequence); }
    };

    for (const node of geometryLayer.level0Nodes) {
        node.traverse(cO);
    }
}

ApiGlobe.prototype.moveLayerUp = function moveLayerUp(layerId) {
    const imageryLayers = this.scene.getAttachedLayers(l => l.type === 'color');
    const layer = this.getLayerById(layerId);
    ImageryLayers.moveLayerUp(layer, imageryLayers);
    updateLayersOrdering(this.scene._geometryLayers[0], imageryLayers);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerDown = function moveLayerDown(layerId) {
    const imageryLayers = this.scene.getAttachedLayers(l => l.type === 'color');
    const layer = this.getLayerById(layerId);
    ImageryLayers.moveLayerDown(layer, imageryLayers);
    updateLayersOrdering(this.scene._geometryLayers[0], imageryLayers);
    this.scene.renderScene3D();
};

/**
 * Moves a specific layer to a specific index in the layer list. This function has no effect if the layer is moved to its current index.
 * @constructor
 * @param      {string}  layerId   The layer's idendifiant
 * @param      {number}  newIndex   The new index
 */
ApiGlobe.prototype.moveLayerToIndex = function moveLayerToIndex(layerId, newIndex) {
    const imageryLayers = this.scene.getAttachedLayers(l => l.type === 'color');
    const layer = this.getLayerById(layerId);
    ImageryLayers.moveLayerToIndex(layer, newIndex, imageryLayers);
    updateLayersOrdering(this.scene._geometryLayers[0], imageryLayers);
    this.scene.renderScene3D();

    eventLayerChangedIndex.layerIndex = newIndex;
    eventLayerChangedIndex.layerId = layerId;
    this.viewerDiv.dispatchEvent(eventLayerChangedIndex);
};

/**
 * Removes a specific imagery layer from the current layer list. This removes layers inserted with attach().
 * @constructor
 * @param      {string}   id      The identifier
 * @return     {boolean}  { description_of_the_return_value }
 */
ApiGlobe.prototype.removeImageryLayer = function removeImageryLayer(id) {
    const layer = this.getLayerById(id);
    if (this.scene._geometryLayers[0].detach(layer)) {
        var cO = function cO(object) {
            if (object.removeColorLayer) {
                object.removeColorLayer(layer.id);
            }
        };

        for (const root of this.scene._geometryLayers[0].level0Nodes) {
            root.traverse(cO);
        }

        this.scene.renderScene3D();
        eventLayerRemoved.layer = id;
        this.viewerDiv.dispatchEvent(eventLayerRemoved);
        return true;
    }

    return false;
};

/**
 * Gets the minimum zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/66r8ugq0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {index} index - The index of the layer.
 * @return     {number}  The min of the level.
 */
ApiGlobe.prototype.getMinZoomLevel = function getMinZoomLevel(index) {
    var layer = this.getImageryLayers()[index];
    if (layer && layer.options.zoom) {
        return layer.options.zoom.min;
    } else {
        var layers = this.getImageryLayers();
        let min = Infinity;
        for (var i = layers.length - 1; i >= 0; i--) {
            if (layers[i].options.zoom) {
                min = Math.min(min, layers[i].options.zoom.min);
            }
        }
        return min;
    }
};

/**
 * Gets the maximun zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/y1xcqv4s/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {index} index - The index of the layer.
 * @return     {number}  The max of the level.
 */
ApiGlobe.prototype.getMaxZoomLevel = function getMaxZoomLevel(index) {
    var layer = this.getImageryLayers()[index];
    if (layer && layer.options.zoom) {
        return layer.options.zoom.max;
    } else {
        var layers = this.getImageryLayers();
        let max = 0;
        for (var i = layers.length - 1; i >= 0; i--) {
            if (layers[i].options.zoom) {
                max = Math.max(max, layers[i].options.zoom.max);
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
ApiGlobe.prototype.getImageryLayers = function getImageryLayers() {
    return this.scene.getAttachedLayers(layer => layer.type === 'color');
};

/**
 * Creates the scene (the globe of iTowns).
 * The first parameter is the coordinates on wich the globe will be centered at the initialization.
 * The second one is the HTML div in wich the scene will be created.
 * @constructor
 * @param {Coords} coords.
 * @params {Div} string.
 */

ApiGlobe.prototype.createSceneGlobe = function createSceneGlobe(globeLayerId, coordCarto, viewerDiv) {
    this.viewerDiv = viewerDiv;
    this.sceneLoadedDeferred = defer();

    viewerDiv.addEventListener('globe-built', () => {
        if (!sceneIsLoaded) {
            sceneIsLoaded = true;
            this.sceneLoadedDeferred.resolve();
            this.sceneLoadedDeferred = defer();
        }
    }, false);

    this.globeview = new GlobeView(viewerDiv, coordCarto);

    this.setSceneLoaded().then(() => {
        this.globeview.controls.updateCameraTransformation();
        this.globeview.notifyChange(0, true);
        this.viewerDiv.dispatchEvent(new CustomEvent(INITIALIZED_EVENT));
    });

    return this.globeview;
};

ApiGlobe.prototype.update = function update() {
    this.globeview.notifyChange(0, true);
};

ApiGlobe.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();

    this.lightingPos = coSun.normalize();

    const lighting = this.globeview.wgs84TileLayer.lighting;
    lighting.enable = value;
    lighting.position = coSun;

    this.globeview.atmosphere.updateLightingPos(coSun);
    this.globeview.atmosphere.setRealisticOn(value);
    this.globeview.clouds.updateLightingPos(coSun);
    this.globeview.clouds.setLightingOn(value);

    this.globeview.updateMaterialUniform('lightingEnabled', value);
    this.globeview.updateMaterialUniform('lightPosition', coSun);
    this.globeview.notifyChange(0, true);
};

ApiGlobe.prototype.setLightingPos = function setLightingPos(pos) {
    const lightingPos = pos || CoordStars.getSunPositionInScene(this.ellipsoid, new Date().getTime(), 48.85, 2.35);

    // TODO
    this.scene.browserScene.updateMaterialUniform('lightPosition', lightingPos.clone().normalize());
    this.layers[0].node.updateLightingPos(lightingPos);
};

/**
 * Sets the visibility of a layer. If the layer is not visible in the scene, this function will no effect until the camera looks at the layer.
 * @constructor
 * @param {layer} a layer.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerVisibility = function setLayerVisibility(layer, visible) {
    layer.visible = visible;

    if (layer.threejsLayer != undefined) {
        if (visible) {
            this.globeview.camera.camera3D.layers.enable(layer.threejsLayer);
        } else {
            this.globeview.camera.camera3D.layers.disable(layer.threejsLayer);
        }
    }

    this.globeview.notifyChange(0, true);
    eventLayerChangedVisible.layerId = layer.id;
    eventLayerChangedVisible.visible = visible;
    this.viewerDiv.dispatchEvent(eventLayerChangedVisible);
};

/**
 * Sets the opacity of a layer. If the layer is not visible in the scene, this function will no effect until the layer becomes visible.
 * @constructor
 * @param {layer} a layer.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerOpacity = function setLayerOpacity(layer, opacity) {
    layer.opacity = opacity;
    this.globeview.notifyChange(0, true);
    eventLayerChangedOpacity.layerId = layer.id;
    eventLayerChangedOpacity.opacity = opacity;
    this.viewerDiv.dispatchEvent(eventLayerChangedOpacity);
};

/**
 * Returns the orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/okfj460p/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */
ApiGlobe.prototype.getCameraOrientation = function getCameraOrientation() {
    var tiltCam = this.globeview.controls.getTilt();
    var headingCam = this.globeview.controls.getHeading();
    return [tiltCam, headingCam];
};

/**
 * Returns the camera location projected on the ground in lat,lon.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/mjv7ha02/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCameraLocation = function getCameraLocation() {
    return C.fromXYZ('EPSG:4978', this.globeview.camera.camera3D.position).as('EPSG:4326');
};

/**
 * Retuns the coordinates of the central point on screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/4tjgnv7z/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCameraTargetGeoPosition = function getCameraTargetGeoPosition() {
    return C.fromXYZ('EPSG:4978', this.globeview.controls.getCameraTargetPosition()).as('EPSG:4326');
};

/**
 * Sets orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/9qr2mogh/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param      {object}   orientation  The angle of the rotation in degrees
 * @param      {boolean}  isAnimated   Indicates if animated
 * @return     {Promise}   { description_of_the_return_value }
 */
ApiGlobe.prototype.setCameraOrientation = function setCameraOrientation(orientation, isAnimated) {
    return this.globeview.controls.setOrbitalPosition(undefined, orientation.heading, orientation.tilt, isAnimated).then(() => {
        this.viewerDiv.dispatchEvent(eventOrientation);
    });
};

/**
 * Pick a position on the globe at the given position.
 * @constructor
 * @param {number | MouseEvent} x|event - The x-position inside the Globe element or a mouse event.
 * @param {number | undefined} y - The y-position inside the Globe element.
 * @return {Position} position
 */
ApiGlobe.prototype.pickPosition = function pickPosition(mouse, y) {
    var screenCoords = {
        x: mouse.clientX || mouse,
        y: mouse.clientY || y,
    };

    var pickedPosition = this.scene.getPickPosition(screenCoords);

    this.scene.renderScene3D();

    if (!pickedPosition) {
        return;
    }

    return C.fromXYZ('EPSG:4978', pickedPosition).as('EPSG:4326');
};

/**
 * Returns the tilt in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/kcx0of9j/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getTilt = function getTilt() {
    var tiltCam = this.globeview.controls.getTilt();
    return tiltCam;
};

/**
 * Returns the heading in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/pxv1Lw16/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getHeading = function getHeading() {
    var headingCam = this.globeview.controls.getHeading();
    return headingCam;
};

/**
 * Returns the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lbt1vfek/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {number} number
 */

ApiGlobe.prototype.getRange = function getRange() {
    return this.globeview.controls.getRange();
};

ApiGlobe.prototype.getRangeFromEllipsoid = function getRangeFromEllipsoid() {
    // TODO: error is distance is big with ellipsoid.intersection(ray) because d < 0
    var controlCam = this.globeview.controls;
    var ray = controlCam.getRay();
    var intersection = this.ellipsoid.intersection(ray);
    var camPosition = this.globeview.camera.position();
    var range = intersection.distanceTo(camPosition);

    return range;
};

/**
 * Sets the animation enabled.
 * @constructor
 * @param      {boolean}  enable  The enable
 */
ApiGlobe.prototype.setAnimationEnabled = function setAnimationEnabled(enable) {
    enableAnimation = enable;
};

/**
 * Determines if animation enabled.
 *
 * @return     {boolean}  True if animation enabled, False otherwise.
 */
ApiGlobe.prototype.isAnimationEnabled = function isAnimationEnabled() {
    return enableAnimation;
};

/**
 * Change the tilt.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/p6t76zox/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setTilt = function setTilt(tilt, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    eventOrientation.oldTilt = this.getTilt();
    return this.globeview.controls.setTilt(tilt, isAnimated).then(() => {
        this.viewerDiv.dispatchEvent(eventOrientation);
        this.globeview.notifyChange(1, true);
    });
};

/**
 * Change the heading.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/rxe4xgxj/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setHeading = function setHeading(heading, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    eventOrientation.oldHeading = this.getHeading();
    return this.globeview.controls.setHeading(heading, isAnimated).then(() => {
        this.viewerDiv.dispatchEvent(eventOrientation);
        this.globeview.notifyChange(1, true);
    });
};

/**
 * Resets camera tilt -> sets the tilt to 0°.
 * @constructor
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.resetTilt = function resetTilt(isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    return this.globeview.controls.setTilt(0, isAnimated);
};

/**
 * Resets camera heading -> sets the heading to 0°.
 * @constructor
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.resetHeading = function resetHeading(isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    return this.globeview.controls.setHeading(0, isAnimated);
};

/**
 * Returns the distance in meter between two geographic positions.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/0nLhws5u/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} First - Position.
 * @param {Position} Second - Position.
 * @return {Number} distance
 */

ApiGlobe.prototype.setSceneLoaded = function setSceneLoaded() {
    sceneIsLoaded = false;
    return this.sceneLoadedDeferred.promise;
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/x06yhbq6/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @param {Object} coordinates - The globe coordinates in EPSG_4326 projection to aim to
 * @param {number} coordinates.latitude
 * @param {number} coordinates.longitude
 * @param {number} coordinates.range
 * @param {boolean}  isAnimated - if the movement should be animated
 * @return {Promise} A promise that resolves when the next 'globe-loaded' event fires.
 */
ApiGlobe.prototype.setCameraTargetGeoPosition = function setCameraTargetGeoPosition(coordinates, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    const position3D = coordinates.as('EPSG:4978').xyz();
    position3D.range = coordinates.range;
    return this.globeview.controls.setCameraTargetPosition(position3D, isAnimated).then(() => {
        this.globeview.notifyChange(1, true);
        return this.setSceneLoaded().then(() => {
            this.globeview.controls.updateCameraTransformation();
        });
    });
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * This function allows to change the central position, the zoom level, the range, the scale and the camera orientation at the same time.
 * The level has to be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * The zoom level and the scale can't be set at the same time.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/7yk0mpn0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @param {Position} position
 * @param {number}  position.longitude  Coordinate longitude WGS84 in degree
 * @param {number}  position.latitude  Coordinate latitude WGS84 in degree
 * @param {number}  [position.tilt]  Camera tilt in degree
 * @param {number}  [position.heading]  Camera heading in degree
 * @param {number}  [position.range]  The camera distance to the target center
 * @param {number}  [position.level]  level,  ignored if range is set
 * @param {number}  [position.scale]  scale,  ignored if the zoom level or range is set. For a scale of 1/500 it is necessary to write 0,002.
 * @param {boolean}  isAnimated  Indicates if animated
 * @return {Promise}
 */
ApiGlobe.prototype.setCameraTargetGeoPositionAdvanced = function setCameraTargetGeoPositionAdvanced(position, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    if (position.level) {
        position.range = computeDistanceCameraFromTileZoom(position.level);
    } else if (position.scale) {
        position.range = this.getRangeFromScale(position.scale);
    }
    return this.setCameraTargetGeoPosition(position, isAnimated).then(() => {
        position.range = position.range || this.getRange();
        position.tilt = position.tilt || this.getTilt();
        position.heading = position.heading || this.getHeading();
        return this.globeview.controls.setOrbitalPosition(position.range, position.heading, position.tilt, isAnimated).then(() => {
            this.globeview.notifyChange(1);
            return this.setSceneLoaded().then(() => {
                this.globeview.controls.updateCameraTransformation();
            });
        });
    });
};

/**
 * Sets the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lt3jL5pd/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Number} pRange - The camera altitude.
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setRange = function setRange(pRange, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    eventRange.oldRange = this.getRange();

    return this.globeview.controls.setRange(pRange, isAnimated).then(() => {
        this.globeview.notifyChange(1);
        return this.setSceneLoaded().then(() => {
            this.globeview.controls.updateCameraTransformation();
            this.viewerDiv.dispatchEvent(eventRange);
        });
    });
};

/**
 * Displaces the central point to a specific amount of pixels from its current position.
 * The view flies to the desired coordinate, i.e.is not teleported instantly. Note : The results can be strange in some cases, if ever possible, when e.g.the camera looks horizontally or if the displaced center would not pick the ground once displaced.
 * @constructor
 * @param      {vector}  pVector  The vector
 */
ApiGlobe.prototype.pan = function pan(pVector) {
    this.globeview.controls.pan(pVector.x, pVector.y);
    this.globeview.notifyChange(1);
    this.setSceneLoaded().then(() => {
        this.globeview.controls.updateCameraTransformation();
        this.viewerDiv.dispatchEvent(eventPan);
    });
};

/**
 * Returns the actual zoom level. The level will always be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * @constructor
 * @return     {number}  The zoom level.
 */
ApiGlobe.prototype.getZoomLevel = function getZoomLevel() {
    return computeTileZoomFromDistanceCamera(this.scene.currentCamera(), this.getRange());
};

/**
 * Gets the current zoom level, which is an index in the logical scales predefined for the application.
 * The higher the level, the closer to the ground.
 * The level is always in the [getMinZoomLevel(), getMaxZoomLevel()] range.
 * @constructor
 * @param      {number}  zoom    The zoom
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setZoomLevel = function setZoomLevel(zoom, isAnimated) {
    const range = computeDistanceCameraFromTileZoom(zoom);
    return this.setRange(range, isAnimated);
};

/**
 * Return the current zoom scale at the central point of the view.
 * This function compute the scale of a map
 * @constructor
 * @param      {number}  pitch   Screen pitch, in millimeters ; 0.28 by default
 * @return     {number}  The zoom scale.
 */
ApiGlobe.prototype.getZoomScale = function getZoomScale(pitch) {
    // TODO: Why error div size height in Chrome?
    // Screen pitch, in millimeters
    pitch = (pitch || 0.28) / 1000;
    const camera = this.globeview.camera;
    const FOV = camera.FOV / 180 * Math.PI * 0.5;
    // projection one unit on screen
    const unitProjection = camera.height / (2 * this.getRange() * Math.tan(FOV));
    return pitch * unitProjection;
};

/**
 * Changes the zoom level of the central point of screen so that screen acts as a map with a specified scale.
 *  The view flies to the desired zoom scale;
 * @constructor
 * @param      {number}  zoomScale  The zoom scale
 * @param      {number}  pitch      The pitch
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setZoomScale = function setZoomScale(zoomScale, pitch, isAnimated) {
    const range = this.getRangeFromScale(zoomScale);
    return this.setRange(range, isAnimated);
};

ApiGlobe.prototype.getRangeFromScale = function getRangeFromScale(zoomScale, pitch) {
    // Screen pitch, in millimeters
    pitch = (pitch || 0.28) / 1000;

    const camera = this.globeview.camera;
    const alpha = camera.FOV / 180 * Math.PI * 0.5;
    // Invert one unit projection (see getZoomScale)
    const range = pitch * camera.height / (zoomScale * 2 * Math.tan(alpha));

    return range;
};

/**
 * Some event return the old value before the change. The available events are centerchanged, zoomchanged, orientationchanged, layerchanged:opacity, layerchanged:visible, layerchanged:ipr and layerchanged:index.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

ApiGlobe.prototype.addEventListener = function addEventListenerProto(eventname, callback) {
    if (eventname == 'layerchanged') {
        this.viewerDiv.addEventListener('layerchanged', callback, false);
        this.addEventListenerLayerChanged();
    } else {
        this.viewerDiv.addEventListener(eventname, callback, false);
    }
};

ApiGlobe.prototype.addEventListenerLayerChanged = function addEventListenerLayerChanged() {
    this.viewerDiv.addEventListener('layerchanged:visible', this.callbackLayerChanged, false);
    this.viewerDiv.addEventListener('layerchanged:opacity', this.callbackLayerChanged, false);
    this.viewerDiv.addEventListener('layerchanged:index', this.callbackLayerChanged, false);
};

ApiGlobe.prototype.callbackLayerChanged = function callbackLayerChanged() {
    this.dispatchEvent(eventLayerChanged);
};

/**
 * Remove the event of events listener from the event target.
 * @constructor
 * @param {string} Eventname - The name of the event.
 * @param {callback} Callback - The callback that is called when the event is heard.
 */

ApiGlobe.prototype.removeEventListener = function removeEventListenerProto(eventname, callback) {
    if (eventname == 'layerchanged') {
        this.viewerDiv.removeEventListener('layerchanged', callback, false);
        this.removeEventListenerLayerChanged();
    } else {
        this.viewerDiv.removeEventListener(eventname, callback, false);
    }
};

ApiGlobe.prototype.removeEventListenerLayerChanged = function removeEventListenerLayerChanged() {
    this.viewerDiv.removeEventListener('layerchanged:visible', this.callbackLayerChanged, false);
    this.viewerDiv.removeEventListener('layerchanged:opacity', this.callbackLayerChanged, false);
    this.viewerDiv.removeEventListener('layerchanged:index', this.callbackLayerChanged, false);
};

/**
 * Get the Attribution of all layers in the scene.
 * @return {map}  A Map of attribution.
 */

ApiGlobe.prototype.getLayersAttribution = function getLayersAttribution() {
    const map = new Map();
    this.scene.getAttachedLayers().forEach((l) => {
        if (l.options.attribution) {
            map.set(l.options.attribution.name, l.options.attribution);
        }
    });
    return map;
};

/**
 * Return all the layers in the scene.
 * The type can be 'color', 'elevation' and 'geometry'. If the type is not specified, the function return all the layers.
 * @param {type} Type - The type of the layers wanted.
 */

ApiGlobe.prototype.getLayers = function getLayers(type) {
    if (type === undefined) {
        return [...this.scene._geometryLayers, ...this.scene.getAttachedLayers()];
    } else if (type == 'geometry') {
        return this.scene._geometryLayers;
    } else {
        return this.scene.getAttachedLayers(l => l.type === type);
    }
};

/**
 * Return a layer by its id.
 * @param {id} ID - The id of the layer wanted.
 */

ApiGlobe.prototype.getLayerById = function getLayerById(pId) {
    const att = this.scene.getAttachedLayers(l => l.id === pId);
    if (att.length == 1) {
        return att[0];
    }
    for (const geom of this.scene._geometryLayers) {
        if (geom.id === pId) {
            return geom;
        }
    }
    throw new Error(`No layer with id = '${pId}' found`);
};

ApiGlobe.prototype.loadGPX = function loadGPX(url) {
    loadGpx(url).then((gpx) => {
        if (gpx) {
            this.scene.gpxTracks.children[0].add(gpx);
        }
    });

    this.scene.renderScene3D();
};

export default ApiGlobe;
