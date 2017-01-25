/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */

import Scene from 'Scene/Scene';
import loadGpx from 'Core/Commander/Providers/GpxUtils';
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';
import Ellipsoid from 'Core/Math/Ellipsoid';
import Projection from 'Core/Geographic/Projection';
import CustomEvent from 'custom-event';
import Fetcher from 'Core/Commander/Providers/Fetcher';
import TileMesh from 'Globe/TileMesh';
import updateTreeLayer from 'Process/TreeLayerProcessing';
import { processTiledGeometryNode, initTiledGeometryLayer } from 'Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation, initNewNode } from 'Process/LayeredMaterialNodeProcessing';
import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from 'Process/GlobeTileProcessing';
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile';
import Atmosphere from 'Globe/Atmosphere';
import Clouds from 'Globe/Clouds';
import OBBHelper from 'Renderer/ThreeExtended/OBBHelper';
import GlobeControls from 'Renderer/ThreeExtended/GlobeControls';
import CoordStars from 'Core/Geographic/CoordStars';
import updateFeaturesAtNode from 'Process/FeatureProcessing';

var sceneIsLoaded = false;
const eventLoaded = new CustomEvent('globe-loaded');
const eventRange = new CustomEvent('rangeChanged');
const eventCenter = new CustomEvent('centerchanged');
const eventOrientation = new CustomEvent('orientationchanged');
const eventPan = new CustomEvent('panchanged');
const eventLayerAdded = new CustomEvent('layeradded');
const eventLayerRemoved = new CustomEvent('layerremoved');
const eventLayerChanged = new CustomEvent('layerchanged');
const eventLayerChangedVisible = new CustomEvent('layerchanged:visible');
const eventLayerChangedOpacity = new CustomEvent('layerchanged:opacity');
const eventLayerChangedIndex = new CustomEvent('layerchanged:index');
const eventError = new CustomEvent('error');

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
    this.projection = new Projection();
    this.viewerDiv = null;
}

ApiGlobe.prototype.constructor = ApiGlobe;

/**
 * Add the geometry layer to the scene.
 */
ApiGlobe.prototype.addGeometryLayer = function addGeometryLayer(layer, parentLayerId) {
    this.scene.addLayer(layer, parentLayerId);
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'type', 'geometry');
    return layer;
};

/**
 * This function adds an imagery layer to the scene. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 */
ApiGlobe.prototype.addImageryLayer = function addImageryLayer(layer, parentLayerId) {
    // assume all imageryLayer for globe use LayeredMaterial
    layer.update = updateLayeredMaterialNodeImagery;

    this.scene.addLayer(layer, parentLayerId);

    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'type', 'color');
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'frozen', false);
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'visible', true);
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'opacity', 1.0);
    const colorLayerCount = this.scene.layersConfiguration.getLayers(l => this.scene.layersConfiguration.getLayerAttribute(l.id, 'type') === 'color').length;
    console.log('COUNT', colorLayerCount);
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'sequence', colorLayerCount);

    this.viewerDiv.dispatchEvent(eventLayerAdded);

    return layer;
};

/**
 * This function adds an imagery layer to the scene using a JSON file. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 * @return     {layer}  The Layer.
 */

ApiGlobe.prototype.addImageryLayerFromJSON = function addImageryLayerFromJSON(url, parentLayerId) {
    return Fetcher.json(url).then(result => this.addImageryLayer(result, parentLayerId));
};

/**
 * This function adds an imagery layer to the scene using an array of JSON files. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layers} array - An array of JSON files.
 * @return     {layer}  The Layers.
 */
ApiGlobe.prototype.addImageryLayersFromJSONArray = function addImageryLayersFromJSONArray(urls, parentLayerId) {
    const proms = [];

    for (const url of urls) {
        proms.push(Fetcher.json(url).then(layer => this.addImageryLayer(layer, parentLayerId)));
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
 * @param {Layer} layer.
 */

ApiGlobe.prototype.addElevationLayer = function addElevationLayer(layer, parentLayerId) {
    // assume all imageryLayer for globe use LayeredMaterial
    layer.update = updateLayeredMaterialNodeElevation;

    this.scene.addLayer(layer, parentLayerId);
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'type', 'elevation');
    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'frozen', false);

    this.viewerDiv.dispatchEvent(eventLayerAdded);

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

ApiGlobe.prototype.addElevationLayersFromJSON = function addElevationLayersFromJSON(url, parentLayerId) {
    return Fetcher.json(url).then(result => this.addElevationLayer(result, parentLayerId));
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

ApiGlobe.prototype.addElevationLayersFromJSONArray = function addElevationLayersFromJSONArray(urls, parentLayerId) {
    var proms = [];

    for (const url of urls) {
        proms.push(Fetcher.json(url).then(layer => this.addElevationLayer(layer, parentLayerId)));
    }

    return Promise.all(proms);
};

/**
 * This function adds an feature layer to the scene. The layer id must be unique.
 * @constructor
 * @param {Layer} layer.
 */
ApiGlobe.prototype.addFeatureLayer = function addFeatureLayer(layer, parentLayerId) {
    layer.update = updateFeaturesAtNode;
    // FIXME
    layer.ellipsoid = this.ellipsoid;

    this.scene.addLayer(layer, parentLayerId);

    this.scene.layersConfiguration.setLayerAttribute(layer.id, 'type', 'feature');

    return layer;
};

ApiGlobe.prototype.addFeatureLayerFromJSON = function addFeatureLayerFromJSON(url, parentLayerId) {
    return Fetcher.json(url).then(result => this.addFeatureLayer(result, parentLayerId));
};

ApiGlobe.prototype.addFeatureLayersFromJSONArray = function addFeatureLayersFromJSONArray(urls, parentLayerId) {
    const proms = [];
    for (const url of urls) {
        proms.push(Fetcher.json(url).then(layer => this.addFeatureLayer(layer, parentLayerId)));
    }
    return Promise.all(proms);
};

ApiGlobe.prototype.addFeatureFromJSON = function addFeatureFromJSON(url) {
    return Fetcher.json(url).then(result => this.addFeature(result));
};

ApiGlobe.prototype.addFeaturesFromJSONArray = function addFeaturesFromJSONArray(urls) {
    const proms = [];
    for (const url of urls) {
        proms.push(Fetcher.json(url));
    }
    return Promise.all(proms).then((features) => {
        for (const feature of features) {
            this.addFeature(feature);
        }
    });
};

function updateLayersOrdering(layersConfiguration, globeLayerId) {
    var sequence = layersConfiguration.getColorLayersIdOrderedBySequence();

    var cO = function cO(object) {
        if (object.changeSequenceLayers)
            { object.changeSequenceLayers(sequence); }
    };

    for (const node of layersConfiguration.getLayers(f => f.id === globeLayerId)[0].level0Nodes) {
        node.traverse(cO);
    }
}

ApiGlobe.prototype.moveLayerUp = function moveLayerUp(layerId) {
    this.scene.layersConfiguration.moveLayerUp(layerId);
    updateLayersOrdering(this.scene.layersConfiguration, this.globeLayerId);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerDown = function moveLayerDown(layerId) {
    this.scene.layersConfiguration.moveLayerDown(layerId);
    updateLayersOrdering(this.scene.layersConfiguration, this.globeLayerId);
    this.scene.renderScene3D();
};

/**
 * Moves a specific layer to a specific index in the layer list. This function has no effect if the layer is moved to its current index.
 * @constructor
 * @param      {string}  layerId   The layer's idendifiant
 * @param      {number}  newIndex   The new index
 */
ApiGlobe.prototype.moveLayerToIndex = function moveLayerToIndex(layerId, newIndex) {
    this.scene.layersConfiguration.moveLayerToIndex(layerId, newIndex);
    updateLayersOrdering(this.scene.layersConfiguration, this.globeLayerId);
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
ApiGlobe.prototype.removeImageryLayer = function removeImageryLayer(id) {
    if (this.scene.layersConfiguration.removeLayer(id)) {
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

/**
 * Gets the maximun zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/y1xcqv4s/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {index} index - The index of the layer.
 * @return     {number}  The max of the level.
 */
ApiGlobe.prototype.getMaxZoomLevel = function getMaxZoomLevel(index) {
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
ApiGlobe.prototype.getImageryLayers = function getImageryLayers() {
    return this.scene.layersConfiguration.getLayers((layer, attributes) => attributes.type === 'color');
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
    // TODO: Normalement la creation de scene ne doit pas etre ici....
    // Deplacer plus tard
    this.globeLayerId = globeLayerId;
    this.viewerDiv = viewerDiv;

    viewerDiv.addEventListener('globe-built', () => {
        if (sceneIsLoaded === false) {
            sceneIsLoaded = true;
            this.scene.currentControls().updateCameraTransformation();
            this.scene.updateScene3D();
            viewerDiv.dispatchEvent(eventLoaded);
        } else {
            viewerDiv.dispatchEvent(eventError);
        }
    }, false);

    var gLDebug = false; // true to support GLInspector addon
    var debugMode = false;

    this.ellipsoid = new Ellipsoid({
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137,
    });

    var coordinate = new GeoCoordinate().copy(coordCarto, UNIT.DEGREE);
    // TODO: use GeoCoordinate conversion instead
    var positionCamera = this.ellipsoid.cartographicToCartesian(coordinate);
    this.scene = new Scene(viewerDiv, debugMode, gLDebug);
    this.scene.camera.setPosition(positionCamera);

    this.scene.initDefaultProviders(this.scene);

    this.sceneLoadedDeferred = defer();
    this.addEventListener('globe-loaded', () => {
        this.sceneLoadedDeferred.resolve();
        this.sceneLoadedDeferred = defer();
    });

    // init globe layer with default parameter
    const wgs84TileLayer = {
        // layer base options
        protocol: 'tile',
        id: globeLayerId,
        preUpdate: (context, layer) => preGlobeUpdate(context, layer),
        update: (context, layer, node) => updateTreeLayer(context, layer, node),
        // options for 'tile' protocol
        nodeType: TileMesh,
        builder: new BuilderEllipsoidTile(this.ellipsoid, new Projection()),
        // options for tree-based layer
        initLevel0Nodes: initTiledGeometryLayer(),
        processNode: processTiledGeometryNode,
        // options for tilegeometry
        maxLevel: 18,
        schemeTile: globeSchemeTileWMTS(globeSchemeTile1),
        cullingTest: globeCulling,
        initNewNode,
        mustSubdivide: globeSubdivisionControl,
        // options for globe
        ellipsoid: this.ellipsoid,
    };

    this.addGeometryLayer(wgs84TileLayer);

    const atmosphere = new Atmosphere(this.ellipsoid);
    atmosphere.add(new Clouds());
    this.scene.gfxEngine.scene3D.add(atmosphere);

    const debugIdUpdate = function debugIdUpdate(context, layer, node) {
        var n = node.children.filter(n => n.layer == debugLayer.id);
        if (node.material.visible) {
            if (n.length == 0) {
                n = new OBBHelper(node.OBB(), `id:${node.id}`);
                n.layer = debugLayer.id;
                node.add(n);
                n.update(node.OBB());
            } else {
                n = n[0];
            }
            n.setMaterialVisibility(true);
        }
        if (n.length > 0) {
            n[0].setMaterialVisibility(false);
        }
    };

    const debugLayer = {
        id: 'tile_ids',
        update: debugIdUpdate,
    };

    // uncomment next line to display boundingbox helpers drawn
    // this.addGeometryLayer(debugLayer, wgs84TileLayer.id);

    const size = this.ellipsoid.size.x;
    //
    // Create Control
    //
    this.scene.controls = new GlobeControls(this.scene.camera.camera3D, this.scene.gfxEngine.renderer.domElement, this.scene.gfxEngine, this.ellipsoid.size.x);
    this.scene.controls.rotateSpeed = 0.25;
    this.scene.controls.zoomSpeed = 2.0;
    this.scene.controls.minDistance = 30;
    this.scene.controls.maxDistance = size * 8.0;

    // Init camera
    this.scene.camera.camera3D.near = Math.max(15.0, 0.000002352 * size);
    this.scene.camera.camera3D.far = size * 10;
    this.scene.camera.camera3D.updateProjectionMatrix();
    this.scene.camera.camera3D.updateMatrixWorld(true);

    this.scene.controls.addEventListener('change', this.scene.gfxEngine.update);

    return wgs84TileLayer;
};

ApiGlobe.prototype.update = function update() {
    this.scene.notifyChange(0, true);
};

ApiGlobe.prototype.showClouds = function showClouds() {
    // TODO
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    // TODO
    this.setLightingPos();
    this.scene.gfxEngine.setLightingOn(value);
    this.setRealisticLightingOn(value);
    this.scene.browserScene.updateMaterialUniform('lightingOn', value);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setLightingPos = function setLightingPos(pos) {
    const lightingPos = pos || CoordStars.getSunPositionInScene(this.ellipsoid, new Date().getTime(), 48.85, 2.35);

    // TODO
    this.scene.browserScene.updateMaterialUniform('lightPosition', lightingPos.clone().normalize());
    this.layers[0].node.updateLightingPos(lightingPos);
};

ApiGlobe.prototype.animateTime = function animateTime(value) {
    if (value) {
        this.time += 4000;

        if (this.time) {
            var nMilliSeconds = this.time;
            var coSun = CoordStars.getSunPositionInScene(this.ellipsoid, new Date().getTime() + 3.6 * nMilliSeconds, 0, 0);
            this.lightingPos = coSun;
            this.browserScene.updateMaterialUniform('lightPosition', this.lightingPos.clone().normalize());
            // TODO this.layers[0].node.updateLightingPos(this.lightingPos);
            if (this.orbitOn) { // ISS orbit is 0.0667 degree per second -> every 60th of sec: 0.00111;
                var p = this.camera.camera3D.position;
                var r = Math.sqrt(p.z * p.z + p.x * p.x);
                var alpha = Math.atan2(p.z, p.x) + 0.0001;
                p.x = r * Math.cos(alpha);
                p.z = r * Math.sin(alpha);
            }

            this.scene.gfxEngine.update();
        }
        this.rAF = requestAnimationFrame(this.animateTime.bind(this));
    } else {
        window.cancelAnimationFrame(this.rAF);
    }
};

ApiGlobe.prototype.orbit = function orbit(value) {
    // this.gfxEngine.controls = null;
    this.orbitOn = value;
};


/**
 * Sets the visibility of a layer. If the layer is not visible in the scene, this function will no effect until the camera looks at the layer.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerVisibility = function setLayerVisibility(id, visible) {
    this.scene.layersConfiguration.setLayerAttribute(id, 'visible', visible);

    const threejsLayer = this.scene.layersConfiguration.getLayerAttribute(id, 'threejsLayer');
    if (threejsLayer != undefined) {
        if (visible) {
            this.scene.camera.camera3D.layers.enable(threejsLayer);
        } else {
            this.scene.camera.camera3D.layers.disable(threejsLayer);
        }
    }

    this.scene.notifyChange(0, true);
    eventLayerChangedVisible.layerId = id;
    eventLayerChangedVisible.visible = visible;
    this.viewerDiv.dispatchEvent(eventLayerChangedVisible);
};

/**
 * Sets the opacity of a layer. If the layer is not visible in the scene, this function will no effect until the layer becomes visible.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerOpacity = function setLayerOpacity(id, opacity) {
    this.scene.layersConfiguration.setLayerAttribute(id, 'opacity', opacity);
    this.scene.notifyChange(0, true);
    eventLayerChangedOpacity.layerId = id;
    eventLayerChangedOpacity.opacity = opacity;
    this.viewerDiv.dispatchEvent(eventLayerChangedOpacity);
};

ApiGlobe.prototype.setStreetLevelImageryOn = function setStreetLevelImageryOn(value) {
    this.scene.setStreetLevelImageryOn(value);
};

/**
 * Returns the orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/okfj460p/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */
ApiGlobe.prototype.getCameraOrientation = function getCameraOrientation() {
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

ApiGlobe.prototype.getCameraLocation = function getCameraLocation() {
    var cam = this.scene.currentCamera().camera3D;
    return this.projection.cartesianToGeo(cam.position);
};

/**
 * Retuns the coordinates of the central point on screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/4tjgnv7z/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCenter = function getCenter() {
    var controlCam = this.scene.currentControls();
    return this.projection.cartesianToGeo(controlCam.getTargetCameraPosition());
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
    return this.scene.currentControls().setOrbitalPosition(undefined, orientation.heading, orientation.tilt, isAnimated).then(() => {
        this.viewerDiv.dispatchEvent(eventOrientation);
    });
};

/**
 * Pick a position on the globe at the given position.
 * @constructor
 * @param {Number | MouseEvent} x|event - The x-position inside the Globe element or a mouse event.
 * @param {number | undefined} y - The y-position inside the Globe element.
 * @return {Position} postion
 */
ApiGlobe.prototype.pickPosition = function pickPosition(mouse, y) {
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

ApiGlobe.prototype.getTilt = function getTilt() {
    var tiltCam = this.scene.currentControls().getTilt();
    return tiltCam;
};

/**
 * Returns the heading in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/pxv1Lw16/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getHeading = function getHeading() {
    var headingCam = this.scene.currentControls().getHeading();
    return headingCam;
};

/**
 * Returns the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lbt1vfek/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Number} number
 */

ApiGlobe.prototype.getRange = function getRange() {
    return this.scene.currentControls().getRange();
};

ApiGlobe.prototype.getRangeFromEllipsoid = function getRangeFromEllipsoid() {
    // TODO: error is distance is big with ellipsoid.intersection(ray) because d < 0
    var controlCam = this.scene.currentControls();
    var ray = controlCam.getRay();
    var intersection = this.ellipsoid.intersection(ray);
    var camPosition = this.scene.currentCamera().position();
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
    return this.scene.currentControls().setTilt(tilt, isAnimated).then(() => {
        this.viewerDiv.dispatchEvent(eventOrientation);
        this.scene.notifyChange(1);
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
    return this.scene.currentControls().setHeading(heading, isAnimated).then(() => {
        this.viewerDiv.dispatchEvent(eventOrientation);
        this.scene.notifyChange(1);
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
    return this.scene.currentControls().setTilt(0, isAnimated);
};

/**
 * Resets camera heading -> sets the heading to 0°.
 * @constructor
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.resetHeading = function resetHeading(isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    return this.scene.currentControls().setHeading(0, isAnimated);
};

/**
 * Returns the distance in meter between two geographic positions.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/0nLhws5u/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} First - Position.
 * @param {Position} Second - Position.
 * @return {Number} distance
 */

ApiGlobe.prototype.computeDistance = function computeDistance(p1, p2) {
    return this.ellipsoid.computeDistance(new GeoCoordinate().copy(p1), new GeoCoordinate().copy(p2));
};

ApiGlobe.prototype.setSceneLoaded = function setSceneLoaded() {
    sceneIsLoaded = false;
    return this.sceneLoadedDeferred.promise;
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/x06yhbq6/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {coordinates} coordinates - Properties : longitude and latitude
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setCenter = function setCenter(coordinates, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    eventCenter.oldCenter = this.getCenter();
    const position3D = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(coordinates.longitude, coordinates.latitude, 0, UNIT.DEGREE));
    position3D.range = coordinates.range;
    return this.scene.currentControls().setCenter(position3D, isAnimated).then(() => {
        this.scene.notifyChange(1);
        return this.setSceneLoaded().then(() => {
            this.scene.currentControls().updateCameraTransformation();
            this.viewerDiv.dispatchEvent(eventCenter);
        });
    });
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * This function allows to change the central position, the zoom level, the range, the scale and the camera orientation at the same time.
 * The level has to be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * The zoom level and the scale can't be set at the same time.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/7yk0mpn0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} pPosition - The detailed position in the scene.
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setCenterAdvanced = function setCenterAdvanced(pPosition, isAnimated) {
    isAnimated = isAnimated || this.isAnimationEnabled();
    return this.setCenter(pPosition, isAnimated).then(() => {
        const p = this.scene.currentControls().setOrbitalPosition(undefined, pPosition.heading, pPosition.tilt, isAnimated);
        return p;
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

    return this.scene.currentControls().setRange(pRange, isAnimated).then(() => {
        this.scene.notifyChange(1);
        this.setSceneLoaded().then(() => {
            this.scene.currentControls().updateCameraTransformation();
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
    this.scene.currentControls().pan(pVector.x, pVector.y);
    this.scene.notifyChange(1);
    this.setSceneLoaded().then(() => {
        this.scene.currentControls().updateCameraTransformation();
        this.viewerDiv.dispatchEvent(eventPan);
    });
};

/**
 * Returns the actual zoom level. The level will always be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * @constructor
 * @return     {number}  The zoom level.
 */
ApiGlobe.prototype.getZoomLevel = function getZoomLevel() {
    return this.scene.getZoomLevel();
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
    zoom = Math.max(this.getMinZoomLevel(), zoom);
    zoom = Math.min(this.getMaxZoomLevel(), zoom);
    const distance = this.scene.computeDistanceForZoomLevel(zoom, this.scene.currentCamera());
    return this.setRange(distance, isAnimated);
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
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
ApiGlobe.prototype.setZoomScale = function setZoomScale(zoomScale, pitch, isAnimated) {
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
    return this.setRange(range, isAnimated);
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

ApiGlobe.prototype.selectNodeById = function selectNodeById(id) {
    this.scene.selectNodeId(id);
    this.scene.notifyChange(0, true);
};

ApiGlobe.prototype.loadGPX = function loadGPX(url) {
    loadGpx(url, this.ellipsoid).then((gpx) => {
        if (gpx) {
            this.scene.gpxTracks.children[0].add(gpx);
        }
    });

    this.scene.renderScene3D();
};

ApiGlobe.prototype.addFeature = function addFeature(options) {
    if (options === undefined)
        { throw new Error('options is required'); }

    // TODO
    // const layer = this.scene.layersConfiguration.getLayers(l => l.id === options.layerId)[0];
    // if (options.geometry !== undefined && layer !== undefined) {
    //     const tools = this.scene.scheduler.getProtocolProvider('wfs').featureToolBox;
    //     this.scene.scene3D.add(tools.processingGeoJSON(this.ellipsoid, options.geometry));
    // }
};

ApiGlobe.prototype.pickFeature = function pickFeature(position, layerId) {
    if (position == undefined)
        { throw new Error('position is required'); }

    const layer = this.scene.layersConfiguration.getGeometryLayerById(layerId);
    return this.scene.gfxEngine.getPickObject3d(position, layer.root);
};

ApiGlobe.prototype.removeFeature = function removeFeature(feature) {
    const featureId = feature.featureId;
    const layerId = feature.layerId;

    const layer = this.scene.layersConfiguration.getGeometryLayerById(layerId);
    // FIXME: don't work?
    layer.root.children.splice(featureId, 1);
};

export default ApiGlobe;
