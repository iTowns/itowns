/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */

import CustomEvent from 'custom-event';
import Scene from '../../../../Scene/Scene';
import { GeometryLayer, ImageryLayers } from '../../../../Scene/Layer';
import WMTS_Provider from '../../Providers/WMTS_Provider';
import WMS_Provider from '../../Providers/WMS_Provider';
import TileProvider from '../../Providers/TileProvider';
import loadGpx from '../../Providers/GpxUtils';
import { C, ellipsoidSizes } from '../../../Geographic/Coordinates';
import Fetcher from '../../Providers/Fetcher';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from '../../../../Scene/LayerUpdateStrategy';
import GlobeControls from '../../../../Renderer/ThreeExtended/GlobeControls';
import { processTiledGeometryNode, initTiledGeometryLayer } from '../../../../Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from '../../../../Process/LayeredMaterialNodeProcessing';
import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../../../../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from '../../../../Globe/BuilderEllipsoidTile';
import Atmosphere from '../../../../Globe/Atmosphere';
import Clouds from '../../../../Globe/Clouds';
import CoordStars from '../../../../Core/Geographic/CoordStars';

export const INITIALIZED_EVENT = 'initialized';

var eventLayerAdded = new CustomEvent('layeradded');
var eventLayerRemoved = new CustomEvent('layerremoved');
var eventLayerChanged = new CustomEvent('layerchanged');
var eventLayerChangedVisible = new CustomEvent('layerchanged:visible');
var eventLayerChangedOpacity = new CustomEvent('layerchanged:opacity');
var eventLayerChangedIndex = new CustomEvent('layerchanged:index');

function ApiGlobe() {
    // Constructor
    this.scene = null;
    this.commandsTree = null;
    this.viewerDiv = null;
    this.callback = null;
}

ApiGlobe.prototype.constructor = ApiGlobe;

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

    if (!provider) {
        return;
    }

    if (provider.tileInsideLimit) {
        layer.tileInsideLimit = provider.tileInsideLimit.bind(provider);
    }

    if (provider.tileTextureCount) {
        layer.tileTextureCount = provider.tileTextureCount.bind(provider);
    }

    if (provider.preprocessDataLayer) {
        provider.preprocessDataLayer(layer);
    }
}

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

/**
 * This function adds an imagery layer to the scene. The layer id must be unique.
 * The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} Layer
 */

ApiGlobe.prototype.addImageryLayer = function addImageryLayer(layer) {
    preprocessLayer(layer, this.scene.scheduler.getProtocolProvider(layer.protocol));
    // assume all imageryLayer for globe use LayeredMaterial
    layer.update = updateLayeredMaterialNodeImagery;

    this.scene._geometryLayers[0].attach(layer);
    layer.type = 'color';
    layer.frozen = false;
    layer.visible = true;
    layer.opacity = 1.0;
    const colorLayerCount = this.scene.getAttachedLayers(l => l.type === 'color').length;
    layer.sequence = colorLayerCount - 1;

    this.scene.notifyChange(1, true);
    this.viewerDiv.dispatchEvent(eventLayerAdded);

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
    preprocessLayer(layer, this.scene.scheduler.getProtocolProvider(layer.protocol));

    // assume all elevation layer for globe use LayeredMaterial
    layer.update = updateLayeredMaterialNodeElevation;

    this.scene._geometryLayers[0].attach(layer);
    layer.type = 'elevation';
    layer.frozen = false;

    this.scene.notifyChange(1, true);
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
 * Removes a specific imagery layer from the current layer list. This removes layers inserted with addLayer().
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

ApiGlobe.prototype.initProviders = function initProviders(scene) {
    var gLDebug = false; // true to support GLInspector addon

    // Register all providers
    var wmtsProvider = new WMTS_Provider({
        support: gLDebug,
    });

    scene.scheduler.addProtocolProvider('wmts', wmtsProvider);
    scene.scheduler.addProtocolProvider('wmtsc', wmtsProvider);
    scene.scheduler.addProtocolProvider('tile', new TileProvider());
    scene.scheduler.addProtocolProvider('wms', new WMS_Provider({ support: gLDebug }));
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

    viewerDiv.addEventListener('globe-built', function fn() {
        viewerDiv.removeEventListener('globe-built', fn);
        viewerDiv.dispatchEvent(new CustomEvent(INITIALIZED_EVENT));
    }, false);

    var gLDebug = false; // true to support GLInspector addon
    var debugMode = false;

    var positionCamera = new C.EPSG_4326(
        coordCarto.longitude,
        coordCarto.latitude,
        coordCarto.altitude);

    // FIXME: the scene is not really in EPSG:4978 atm, some axis are inverted, see
    // https://github.com/iTowns/itowns2/pull/246
    this.scene = Scene('EPSG:4978', positionCamera, viewerDiv, debugMode, gLDebug);

    this.initProviders(this.scene);

    const size = ellipsoidSizes().x;

    // Init camera
    this.scene.camera.camera3D.near = Math.max(15.0, 0.000002352 * size);
    this.scene.camera.camera3D.far = size * 10;
    this.scene.camera.camera3D.updateProjectionMatrix();
    this.scene.camera.camera3D.updateMatrixWorld(true);

    // Create Control
    const positionTargetCamera = positionCamera.clone();
    positionTargetCamera.setAltitude(0);

    this.scene.controls = new GlobeControls(
        this.scene.camera.camera3D,
        positionTargetCamera.as('EPSG:4978').xyz(),
        this.viewerDiv,
        this.scene.gfxEngine);
    this.scene.controls.rotateSpeed = 0.25;
    this.scene.controls.zoomSpeed = 2.0;
    this.scene.controls.minDistance = 30;
    this.scene.controls.maxDistance = size * 8.0;
    this.scene.controls.addEventListener('change', this.scene.gfxEngine.update);

    const nodeInitFn = function nodeInitFn(context, layer, parent, node) {
        node.materials[0].setLightingOn(layer.lighting.enable);
        node.materials[0].uniforms.lightPosition.value = layer.lighting.position;

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: layer.showOutline || false };
            node.material.wireframe = layer.wireframe || false;
        }
    };

    const SSE_SUBDIVISION_THRESHOLD = 1.0;

    // init globe layer with default parameter
    const wgs84TileLayer = new GeometryLayer(globeLayerId);

    const initLayer = initTiledGeometryLayer(globeSchemeTileWMTS(globeSchemeTile1));

    wgs84TileLayer.preUpdate = (context, layer) => {
        if (layer.level0Nodes === undefined) {
            initLayer(context, layer);
        }
        preGlobeUpdate(context);
        return layer.level0Nodes;
    };
    wgs84TileLayer.update =
        processTiledGeometryNode(
            globeCulling,
            globeSubdivisionControl(2, 17, SSE_SUBDIVISION_THRESHOLD),
            nodeInitFn);

    // provider options
    wgs84TileLayer.builder = new BuilderEllipsoidTile();

    this.scene.addGeometryLayer(wgs84TileLayer);

    const threejsLayer = this.scene.getUniqueThreejsLayer();
    wgs84TileLayer.type = 'geometry';
    wgs84TileLayer.protocol = 'tile';
    wgs84TileLayer.threejsLayer = 'threejsLayer';
    wgs84TileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    // enable by default
    this.scene.currentCamera().camera3D.layers.enable(threejsLayer);

    this.atmosphere = new Atmosphere();
    this.clouds = new Clouds();
    this.atmosphere.add(this.clouds);

    const atmosphereLayer = this.scene.getUniqueThreejsLayer();
    this.atmosphere.traverse((obj) => { obj.layers.set(atmosphereLayer); });
    this.scene.currentCamera().camera3D.layers.enable(atmosphereLayer);

    this.scene.gfxEngine.scene3D.add(this.atmosphere);

    // enable only globe-rendering when performing picking
    this.scene.controls.controlsActiveLayers = 1 << wgs84TileLayer.threejsLayer;

    return wgs84TileLayer;
};

ApiGlobe.prototype.update = function update() {
    this.scene.notifyChange(0, true);
};

ApiGlobe.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();

    this.lightingPos = coSun.normalize();

    const lighting = this.scene._geometryLayers[0].lighting;
    lighting.enable = value;
    lighting.position = coSun;

    this.atmosphere.updateLightingPos(coSun);
    this.atmosphere.setRealisticOn(value);
    this.clouds.updateLightingPos(coSun);
    this.clouds.setLightingOn(value);

    this.scene.updateMaterialUniform('lightingEnabled', value);
    this.scene.updateMaterialUniform('lightPosition', coSun);
    this.scene.renderScene3D();
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
            this.scene.camera.camera3D.layers.enable(layer.threejsLayer);
        } else {
            this.scene.camera.camera3D.layers.disable(layer.threejsLayer);
        }
    }

    this.scene.notifyChange(0, true);
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
    this.scene.notifyChange(0, true);
    eventLayerChangedOpacity.layerId = layer.id;
    eventLayerChangedOpacity.opacity = opacity;
    this.viewerDiv.dispatchEvent(eventLayerChangedOpacity);
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
