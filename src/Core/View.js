/**
 * Generated On: 2015-10-5
 * Class: Scene
 * Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
 */

/* global window, requestAnimationFrame */
import { Scene, EventDispatcher } from 'three';
import Camera from '../Renderer/Camera';
import MainLoop from './MainLoop';
import c3DEngine from '../Renderer/c3DEngine';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from './Layer/LayerUpdateStrategy';
import { GeometryLayer, Layer, defineLayerProperty } from './Layer/Layer';
import Scheduler from './Scheduler/Scheduler';

/**
 * Constructs an Itowns Scene instance
 *
 * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
 * @param {HTMLElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
 * @param {Object=} options - Optional properties.
 * @param {?MainLoop} options.mainLoop - {@link MainLoop} instance to use, otherwise a default one will be constructed
 * @param {?WebGLRenderer} options.renderer - {@link WebGLRenderer} instance to use, otherwise a default one will be constructed. If
 *    not present, a new <canvas> will be created and added to viewerDiv (mutually exclusive with mainLoop)
 * @param {?Scene} options.scene3D - {@link Scene} instance to use, otherwise a default one will be constructed
 * @constructor
 * @example
 * // How add gpx object
 * itowns.loadGpx(url).then((gpx) => {
 *      if (gpx) {
 *         viewer.scene.add(gpx);
 *      }
 * });
 *
 * viewer.notifyChange(true);
 */
 /* TODO:
 * - remove debug boolean, replace by if __DEBUG__ and checkboxes in debug UI
 * - Scene (and subobjects) should be instanciable several times.
 */
function View(crs, viewerDiv, options = {}) {
    this.referenceCrs = crs;

    this.mainLoop = options.mainLoop || new MainLoop(new Scheduler(), new c3DEngine(viewerDiv, options.renderer));

    this.scene = options.scene3D || new Scene();
    if (!options.scene3D) {
        this.scene.autoUpdate = false;
    }

    this.camera = new Camera(
        this.mainLoop.gfxEngine.getWindowSize().x,
        this.mainLoop.gfxEngine.getWindowSize().y,
        options);

    this._layers = [];

    this.viewerDiv = viewerDiv;
    window.addEventListener('resize', () => {
        this.mainLoop.gfxEngine.onWindowResize();
        this.camera.resize(this.viewerDiv.clientWidth, this.viewerDiv.clientHeight);
        this.camera.update();
        this.notifyChange(true);
    }, false);

    this.onAfterRender = () => {};

    this._changeSources = new Set();
}

View.prototype = Object.create(EventDispatcher.prototype);
View.prototype.constructor = View;

const _syncThreejsLayer = function _syncThreejsLayer(layer, view) {
    if (layer.visible) {
        view.camera.camera3D.layers.enable(layer.threejsLayer);
    } else {
        view.camera.camera3D.layers.disable(layer.threejsLayer);
    }
};

function _preprocessLayer(view, layer, provider) {
    if (!(layer instanceof Layer) && !(layer instanceof GeometryLayer)) {
        const nlayer = new Layer(layer.id);
        delete layer.id;
        layer = Object.assign(nlayer, layer);
    }

    if (!layer.updateStrategy) {
        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
        };
    }

    if (provider) {
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

    // probably not the best place to do this
    if (layer.type == 'color') {
        defineLayerProperty(layer, 'frozen', false);
        defineLayerProperty(layer, 'visible', true);
        defineLayerProperty(layer, 'opacity', 1.0);
        defineLayerProperty(layer, 'sequence', 0);
    } else if (layer.type == 'elevation') {
        defineLayerProperty(layer, 'frozen', false);
    } else if (layer.type == 'geometry' || layer.type == 'debug') {
        layer.threejsLayer = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
        defineLayerProperty(layer, 'visible', true, () => _syncThreejsLayer(layer, view));
        _syncThreejsLayer(layer, view);
    }
    return layer;
}

/**
 * Options to wms protocol
 * @typedef {Object} OptionsWms
 * @property {Attribution} attribution The intellectual property rights for the layer
 * @property {Object} extent Geographic extent of the service
 * @property {string} name
 * @property {string} mimetype
 */

/**
 * Options to wtms protocol
 * @typedef {Object} OptionsWmts
 * @property {Attribution} attribution The intellectual property rights for the layer
 * @property {string} attribution.name The name of the owner of the data
 * @property {string} attribution.url The website of the owner of the data
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
 * @typedef {Object} NetworkOptions - Options for fetching resources over the
 * network. For json or xml fetching, this object is passed as it is to fetch
 * as the init object, see [fetch documentation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters}.
 * @property {string} crossOrigin For textures, only this property is used. Its
 * value is directly assigned to the crossorigin property of html tags.
 * @property * Same properties as the init parameter of fetch
 */

/**
 * @typedef {Object} LayerOptions
 * @property {string} id Unique layer's id
 * @property {string} type the layer's type : 'color', 'elevation', 'geometry'
 * @property {string} protocol wmts and wms (wmtsc for custom deprecated)
 * @property {string} url Base URL of the repository or of the file(s) to load
 * @property {NetworkOptions} networkOptions Options for fetching resources over network
 * @property {Object} updateStrategy strategy to load imagery files
 * @property {OptionsWmts|OptionsWms} options WMTS or WMS options
 */

/**
 * Add layer in viewer.
 * The layer id must be unique.
 *
 * @example
 * // Add Color Layer
 * view.addLayer({
 *      type: 'elevation',
 *      id: 'iElevation',
 * });
 *
 * // Example to add an OPENSM Layer
 * view.addLayer({
 *   type: 'color',
 *   protocol:   'wmtsc',
 *   id:         'OPENSM',
 *   fx: 2.5,
 *   customUrl:  'http://b.tile.openstreetmap.fr/osmfr/%TILEMATRIX/%COL/%ROW.png',
 *   options: {
 *       attribution : {
 *           name: 'OpenStreetMap',
 *           url: 'http://www.openstreetmap.org/',
 *       },
 *       tileMatrixSet: 'PM',
 *       mimetype: 'image/png',
 *    },
 * });
 *
 * // Add Elevation Layer
 * view.addLayer({
 *      type: 'elevation',
 *      id: 'iElevation',
 * });
 *
 * @param {LayerOptions|Layer|GeometryLayer} layer
 * @param {Layer=} parentLayer
 * @return {Layer|GeometryLayer}
 */
View.prototype.addLayer = function addLayer(layer, parentLayer) {
    layer = _preprocessLayer(this, layer, this.mainLoop.scheduler.getProtocolProvider(layer.protocol));
    if (parentLayer) {
        parentLayer.attach(layer);
    } else {
        if (typeof (layer.update) !== 'function') {
            throw new Error('Cant add GeometryLayer: missing a update function');
        }
        if (typeof (layer.preUpdate) !== 'function') {
            throw new Error('Cant add GeometryLayer: missing a preUpdate function');
        }

        this._layers.push(layer);
    }

    return layer;
};

/**
 * Notifies the scene it needs to be updated due to changes exterior to the
 * scene itself (e.g. camera movement).
 * non-interactive events (e.g: texture loaded)
 * @param {boolean} needsRedraw - indicates if notified change requires a full scene redraw.
 * @param {*} changeSource
 */
View.prototype.notifyChange = function notifyChange(needsRedraw, changeSource) {
    this._changeSources.add(changeSource);
    this.mainLoop.scheduleViewUpdate(this, needsRedraw);
};

/**
 * Get all layers, with an optionnal filter applied.
 * The filter method will be called with 2 args:
 *   - 1st: current layer
 *   - 2nd: (optional) the geometry layer to which the current layer is attached
 * @example
 * // get all layers
 * view.getLayers();
 * // get all color layers
 * view.getLayers(layer => layer.type === 'color');
 * // get all elevation layers
 * view.getLayers(layer => layer.type === 'elevation');
 * // get all geometry layers
 * view.getLayers(layer => layer.type === 'geometry');
 * // get one layer with id
 * view.getLayers(layer => layer.id === 'itt');
 * @param {function(Layer):boolean} filter
 * @returns {Array<Layer>}
 */
View.prototype.getLayers = function getLayers(filter) {
    const result = [];
    for (const geometryLayer of this._layers) {
        if (!filter || filter(geometryLayer)) {
            result.push(geometryLayer);
        }
        for (const attached of geometryLayer._attachedLayers) {
            if (!filter || filter(attached, geometryLayer)) {
                result.push(attached);
            }
        }
    }
    return result;
};

export default View;
