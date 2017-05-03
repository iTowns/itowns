/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */

import CustomEvent from 'custom-event';
import { ImageryLayers } from '../../../Layer/Layer';
import loadGpx from '../../Providers/GpxUtils';
import Fetcher from '../../Providers/Fetcher';
import CoordStars from '../../../Geographic/CoordStars';
import GlobeView from '../../../Prefab/GlobeView';

export const INITIALIZED_EVENT = 'initialized';

var eventLayerAdded = new CustomEvent('layeradded');
var eventLayerRemoved = new CustomEvent('layerremoved');
var eventLayerChanged = new CustomEvent('layerchanged');
var eventLayerChangedVisible = new CustomEvent('layerchanged:visible');
var eventLayerChangedOpacity = new CustomEvent('layerchanged:opacity');
var eventLayerChangedIndex = new CustomEvent('layerchanged:index');


/**
 * Api
 * @deprecated for the release
 * @constructor
 */
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
    this.viewerDiv.dispatchEvent(eventLayerAdded);

    return layer;
};

/**
 * This function adds an imagery layer to the scene using a JSON file. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @param {Layer} layer.
 * @return     {layer}  The Layer.
 */

ApiGlobe.prototype.addImageryLayerFromJSON = function addImageryLayerFromJSON(url) {
    return Fetcher.json(url).then(result => this.addImageryLayer(result));
};

/**
 * This function adds an imagery layer to the scene using an array of JSON files. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
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
        if (object.changeSequenceLayers) {
            object.changeSequenceLayers(sequence);
        }
    };

    for (const node of geometryLayer.level0Nodes) {
        node.traverse(cO);
    }
}

ApiGlobe.prototype.moveLayerUp = function moveLayerUp(layerId) {
    const imageryLayers = this.getImageryLayers();
    const layer = this.getLayerById(layerId);
    ImageryLayers.moveLayerUp(layer, imageryLayers);
    updateLayersOrdering(this.globeview.wgs84TileLayer, imageryLayers);
    this.globeview.notifyChange(0, true);
};

ApiGlobe.prototype.moveLayerDown = function moveLayerDown(layerId) {
    const imageryLayers = this.getImageryLayers();
    const layer = this.getLayerById(layerId);
    ImageryLayers.moveLayerDown(layer, imageryLayers);
    updateLayersOrdering(this.globeview.wgs84TileLayer, imageryLayers);
    this.globeview.notifyChange(0, true);
};

/**
 * Moves a specific layer to a specific index in the layer list. This function has no effect if the layer is moved to its current index.
 * @param      {string}  layerId   The layer's idendifiant
 * @param      {number}  newIndex   The new index
 */
ApiGlobe.prototype.moveLayerToIndex = function moveLayerToIndex(layerId, newIndex) {
    const imageryLayers = this.getImageryLayers();
    const layer = this.getLayerById(layerId);
    ImageryLayers.moveLayerToIndex(layer, newIndex, imageryLayers);
    updateLayersOrdering(this.globeview.wgs84TileLayer, imageryLayers);
    this.globeview.notifyChange(0, true);

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
    if (this.globeview.wgs84TileLayer.detach(layer)) {
        var cO = function cO(object) {
            if (object.removeColorLayer) {
                object.removeColorLayer(id);
            }
        };

        for (const root of this.globeview.wgs84TileLayer.level0Nodes) {
            root.traverse(cO);
        }

        for (const color of this.getImageryLayers()) {
            if (color.sequence > layer.sequence) {
                color.sequence--;
            }
        }

        this.globeview.notifyChange(0, true);
        eventLayerRemoved.layer = id;
        this.viewerDiv.dispatchEvent(eventLayerRemoved);
        return true;
    }

    return false;
};

/**
 * Gets the minimum zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/66r8ugq0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
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
 * @return     {layer}  The Layers.
 */
ApiGlobe.prototype.getImageryLayers = function getImageryLayers() {
    return this.getLayers('color');
};

/**
 * Creates the scene (the globe of iTowns).
 * The first parameter is the coordinates on wich the globe will be centered at the initialization.
 * The second one is the HTML div in wich the scene will be created.
 * @param {Coords} coords.
 * @params {Div} string.
 */

ApiGlobe.prototype.createSceneGlobe = function createSceneGlobe(globeLayerId, coordCarto, viewerDiv) {
    this.viewerDiv = viewerDiv;

    viewerDiv.addEventListener('globe-built', function fn() {
        viewerDiv.removeEventListener('globe-built', fn);
        viewerDiv.dispatchEvent(new CustomEvent(INITIALIZED_EVENT));
    }, false);

    this.globeview = new GlobeView(viewerDiv, coordCarto);

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
 * Some event return the old value before the change. The available events are centerchanged, zoomchanged, orientationchanged, layerchanged:opacity, layerchanged:visible, layerchanged:ipr and layerchanged:index.
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
    this.globeview.getLayers().forEach((l) => {
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
        return this.globeview.getLayers();
    } else if (type == 'geometry') {
        return this.globeview.getLayers((f, g) => !g);
    } else {
        return this.globeview.getLayers(l => l.type === type);
    }
};

/**
 * Return a layer by its id.
 * @param {id} ID - The id of the layer wanted.
 */

ApiGlobe.prototype.getLayerById = function getLayerById(pId) {
    const att = this.globeview.getLayers(l => l.id === pId);
    if (att.length == 1) {
        return att[0];
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
