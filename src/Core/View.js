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
import Debug from '../../utils/debug/Debug';

/**
 * Constructs an Itowns Scene instance
 *
 * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
 * @param {DOMElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
 * @param {boolean} options - Optional properties. May contain:
 *    - mainLoop: {MainLoop} instance to use, otherwise a default one will be constructed
 *    - renderer: {WebGLRenderer} instance to use, otherwise a default one will be constructed. If
 *    not present, a new <canvas> will be created and added to viewerDiv (mutually exclusive with mainLoop)
 *    - scene3D: {Scene} instance to use, otherwise a default one will be constructed
 * @param {boolean} glDebug - debug gl code
 * @constructor
 * @example
 * // How add gpx object
 * itowns.loadGpx(url).then((gpx) => {
 *      if (gpx) {
 *         viewer.scene.add(gpx);
 *      }
 * });
 *
 * viewer.notifyChange(0, true);
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
        viewerDiv.clientWidth,
        viewerDiv.clientHeight);

    this._layers = [];

    if (__DEBUG__) {
        Debug(this, viewerDiv);
    }

    this.viewerDiv = viewerDiv;
    window.addEventListener('resize', () => {
        this.mainLoop.gfxEngine.onWindowResize();
        this.camera.resize(this.viewerDiv.clientWidth, this.viewerDiv.clientHeight);
        this.camera.update();
        this.notifyChange(0, true);
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
 * LayerOptions
 * @typedef {Object} LayerOptions
 * @property {string} id Unique layer's id
 * @property {string} type the layer's type : 'color', 'elevation', 'geometry'
 * @property {string} layer.protocol wmts and wms (wmtsc for custom deprecated)
 * @property {string} layer.url Base URL of the repository or of the file(s) to load
 * @property {Object} layer.updateStrategy strategy to load imagery files
 * @property {OptionsWmts|OptionsWms} layer.options WMTS or WMS options
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
 * @param {LayerOptions} layer option
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
 * @param {Number} delay Using a non-0 delay allows to delay update - useful to reduce CPU load for
 * non-interactive events (e.g: texture loaded)
 * @param {Boolean} needsRedraw indicates if notified change requires a full scene redraw.
 */
View.prototype.notifyChange = function notifyChange(delay, needsRedraw, changeSource) {
    if (delay) {
        window.setTimeout(() => {
            this._changeSources.add(changeSource);
            this.mainLoop.scheduleViewUpdate(this, needsRedraw);
        }, delay);
    } else {
        this._changeSources.add(changeSource);
        this.mainLoop.scheduleViewUpdate(this, needsRedraw);
    }
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
 * @param {function} filter
 * @returns {Array}  array of Layer
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
