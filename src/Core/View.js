/* global window, requestAnimationFrame */
import { Scene, EventDispatcher, Vector2 } from 'three';
import Camera from '../Renderer/Camera';
import MainLoop from './MainLoop';
import c3DEngine from '../Renderer/c3DEngine';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from './Layer/LayerUpdateStrategy';
import { GeometryLayer, Layer, defineLayerProperty } from './Layer/Layer';
import Scheduler from './Scheduler/Scheduler';

/**
 * Constructs an Itowns View instance
 *
 * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
 * @param {HTMLElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
 * @param {Object=} options - Optional properties.
 * @param {?MainLoop} options.mainLoop - {@link MainLoop} instance to use, otherwise a default one will be constructed
 * @param {?(WebGLRenderer|object)} options.renderer - {@link WebGLRenderer} instance to use, otherwise
 * a default one will be constructed. In this case, if options.renderer is an object, it will be used to
 * configure the renderer (see {@link c3DEngine}.  If not present, a new <canvas> will be created and
 * added to viewerDiv (mutually exclusive with mainLoop)
 * @param {?Scene} options.scene3D - {@link Scene} instance to use, otherwise a default one will be constructed
 * @constructor
 * @example
 * // How add gpx object
 * itowns.GpxUtils.load(url, viewer.referenceCrs).then((gpx) => {
 *      if (gpx) {
 *         viewer.scene.add(gpx);
 *      }
 * });
 *
 * viewer.notifyChange(true);
 */
 /* TODO:
 * - remove debug boolean, replace by if __DEBUG__ and checkboxes in debug UI
 */
function View(crs, viewerDiv, options = {}) {
    if (!viewerDiv) {
        throw new Error('Invalid viewerDiv parameter (must non be null/undefined)');
    }

    this.referenceCrs = crs;

    let engine;
    // options.renderer can be 2 separate things:
    //   - an actual renderer (in this case we don't use viewerDiv)
    //   - options for the renderer to be created
    if (options.renderer && options.renderer.domElement) {
        engine = new c3DEngine(options.renderer);
    } else {
        engine = new c3DEngine(viewerDiv, options.renderer);
    }

    this.mainLoop = options.mainLoop || new MainLoop(new Scheduler(), engine);

    this.scene = options.scene3D || new Scene();
    if (!options.scene3D) {
        this.scene.autoUpdate = false;
    }

    this.camera = new Camera(
        this.referenceCrs,
        this.mainLoop.gfxEngine.getWindowSize().x,
        this.mainLoop.gfxEngine.getWindowSize().y,
        options);

    this._frameRequesters = [];
    this._layers = [];

    window.addEventListener('resize', () => {
        // If the user gave us a container (<div>) then itowns' size is
        // the container's size. Otherwise we use window' size.
        const newSize = new Vector2(viewerDiv.clientWidth, viewerDiv.clientHeight);
        this.mainLoop.gfxEngine.onWindowResize(newSize.x, newSize.y);
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
        // nlayer.id is read-only so delete it from layer before Object.assign
        const tmp = layer;
        delete tmp.id;
        layer = Object.assign(nlayer, layer);
        // restore layer.id in user provider layer object
        tmp.id = layer.id;
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
    }

    if (!layer.whenReady) {
        let providerPreprocessing = Promise.resolve();
        if (provider && provider.preprocessDataLayer) {
            providerPreprocessing = provider.preprocessDataLayer(layer, view, view.mainLoop.scheduler);
            if (!(providerPreprocessing && providerPreprocessing.then)) {
                providerPreprocessing = Promise.resolve();
            }
        }

        // the last promise in the chain must return the layer
        layer.whenReady = providerPreprocessing.then(() => {
            layer.ready = true;
            return layer;
        });
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

        const changeOpacity = (o) => {
            if (o.material) {
                // != undefined: we want the test to pass if opacity is 0
                if (o.material.opacity != undefined) {
                    o.material.transparent = layer.opacity < 1.0;
                    o.material.opacity = layer.opacity;
                }
                if (o.material.uniforms && o.material.uniforms.opacity != undefined) {
                    o.material.transparent = layer.opacity < 1.0;
                    o.material.uniforms.opacity.value = layer.opacity;
                }
            }
        };
        defineLayerProperty(layer, 'opacity', 1.0, () => {
            layer.object3d.traverse((o) => {
                if (o.layer !== layer.id) {
                    return;
                }
                changeOpacity(o);
                // 3dtiles layers store scenes in children's content property
                if (o.content) {
                    o.content.traverse(changeOpacity);
                }
            });
        });
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
 * This function calls `preprocessDataLayer` of the relevant provider with this
 * layer and set `layer.whenReady` to a promise that resolves when
 * the preprocessing operation is done. This promise is also returned by
 * `addLayer` allowing to chain call.
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
 * // Add Elevation Layer and do something once it's ready
 * var layer = view.addLayer({
 *      type: 'elevation',
 *      id: 'iElevation',
 * }).then(() => { .... });
 *
 * // One can also attach a callback to the same promise with a layer instance.
 * layer.whenReady.then(() => { ... });
 *
 * @param {LayerOptions|Layer|GeometryLayer} layer
 * @param {Layer=} parentLayer
 * @return {Promise} a promise resolved with the new layer object when it is fully initialized
 */
View.prototype.addLayer = function addLayer(layer, parentLayer) {
    const duplicate = this.getLayers((l => l.id == layer.id));
    if (duplicate.length > 0) {
        throw new Error(`Invalid id '${layer.id}': id already used`);
    }

    if (parentLayer && !layer.extent) {
        layer.extent = parentLayer.extent;
    }

    const provider = this.mainLoop.scheduler.getProtocolProvider(layer.protocol);
    if (layer.protocol && !provider) {
        throw new Error(`${layer.protocol} is not a recognized protocol name.`);
    }
    layer = _preprocessLayer(this, layer, provider);
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

    this.notifyChange(true);
    return layer.whenReady;
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

/**
 * @typedef {object} FrameRequester
 * @property {Function(dt, updateLoopRestarted)} update - Method that will be called each
 * time the MainLoop updates. This function will be given as parameter the
 * delta (in ms) between this update and the previous one, and whether or not
 * we just started to render again. This update is considered as the "next"
 * update if view.notifyChange was called during a precedent update. If
 * view.notifyChange has been called by something else (other micro/macrotask,
 * UI events etc...), then this update is considered as being the "first".
 *
 * This means that if a FrameRequester.update function wants to animate
 * something, it should keep on calling view.notifyChange until its task is
 * done.
 *
 * Implementors of FrameRequester.update should keep in mind that this function
 * will be potentially called at each frame, thus care should be given about
 * performance.
 *
 * Typical FrameRequesters are controls, module wanting to animate moves or UI
 * elements etc... Basically anything that would want to call
 * requestAnimationFrame.
 */
/**
 * Add a frame requester to this view.
 *
 * FrameRequesters can activate the MainLoop update by calling view.notifyChange.
 *
 * @param {FrameRequester} frameRequester
 * @param {Function} frameRequester.update - update will be called at each
 * MainLoop update with the time delta between last update, or 0 if the
 * MainLoop has just been relaunched.
 */
View.prototype.addFrameRequester = function addFrameRequester(frameRequester) {
    this._frameRequesters.push(frameRequester);
};

/**
 * Remove a frameRequester.
 *
 * @param {FrameRequester} frameRequester
 */
View.prototype.removeFrameRequester = function removeFrameRequester(frameRequester) {
    this._frameRequesters.splice(this._frameRequesters.indexOf(frameRequester), 1);
};

export default View;
