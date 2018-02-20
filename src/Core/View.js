/* global window */
import { Scene, EventDispatcher, Vector2, Object3D } from 'three';
import Camera from '../Renderer/Camera';
import MainLoop, { MAIN_LOOP_EVENTS, RENDERING_PAUSED } from './MainLoop';
import c3DEngine from '../Renderer/c3DEngine';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from './Layer/LayerUpdateStrategy';
import { GeometryLayer, Layer, defineLayerProperty } from './Layer/Layer';
import Scheduler from './Scheduler/Scheduler';
import Picking from './Picking';

export const VIEW_EVENTS = {
    /**
     * Fires when all the layers of the view are considered initialized.
     * Initialized in this context means: all layers are ready to be
     * displayed (no pending network access, no visual improvement to be
     * expected, ...).
     * If you add new layers, the event will be fired again when all
     * layers are ready.
     * @event View#layers-initialized
     * @property type {string} layers-initialized
     */
    LAYERS_INITIALIZED: 'layers-initialized',
};

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
 // TODO:
 // - remove debug boolean, replace by if __DEBUG__ and checkboxes in debug UI
 //
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

    this._frameRequesters = { };
    this._layers = [];

    window.addEventListener('resize', () => {
        // If the user gave us a container (<div>) then itowns' size is
        // the container's size. Otherwise we use window' size.
        const newSize = new Vector2(viewerDiv.clientWidth, viewerDiv.clientHeight);
        this.mainLoop.gfxEngine.onWindowResize(newSize.x, newSize.y);
        this.notifyChange(true);
    }, false);

    this._changeSources = new Set();

    if (__DEBUG__) {
        this.isDebugMode = true;
    }
}

View.prototype = Object.create(EventDispatcher.prototype);
View.prototype.constructor = View;

const _syncGeometryLayerVisibility = function _syncGeometryLayerVisibility(layer, view) {
    if (layer.object3d) {
        layer.object3d.visible = layer.visible;
    }

    if (layer.threejsLayer) {
        if (layer.visible) {
            view.camera.camera3D.layers.enable(layer.threejsLayer);
        } else {
            view.camera.camera3D.layers.disable(layer.threejsLayer);
        }
    }
};

function _preprocessLayer(view, layer, provider, parentLayer) {
    if (!(layer instanceof Layer) && !(layer instanceof GeometryLayer)) {
        const nlayer = new Layer(layer.id);
        // nlayer.id is read-only so delete it from layer before Object.assign
        const tmp = layer;
        delete tmp.id;
        layer = Object.assign(nlayer, layer);
        // restore layer.id in user provider layer object
        tmp.id = layer.id;
    }

    layer.options = layer.options || {};
    // TODO remove this warning and fallback after the release following v2.3.0
    if (!layer.format && layer.options.mimetype) {
        console.warn('layer.options.mimetype is deprecated, please use layer.format');
        layer.format = layer.options.mimetype;
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
        if (layer.type == 'geometry' || layer.type == 'debug') {
            if (!layer.object3d) {
                // layer.threejsLayer *must* be assigned before preprocessing,
                // because TileProvider.preprocessDataLayer function uses it.
                layer.threejsLayer = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
            }
        }
        let providerPreprocessing = Promise.resolve();
        if (provider && provider.preprocessDataLayer) {
            providerPreprocessing = provider.preprocessDataLayer(layer, view, view.mainLoop.scheduler, parentLayer);
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
        defineLayerProperty(layer, 'visible', true, () => _syncGeometryLayerVisibility(layer, view));
        _syncGeometryLayerVisibility(layer, view);

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
            if (layer.object3d) {
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
            }
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
 */

/**
 * Options to wtms protocol
 * @typedef {Object} OptionsWmts
 * @property {Attribution} attribution The intellectual property rights for the layer
 * @property {string} attribution.name The name of the owner of the data
 * @property {string} attribution.url The website of the owner of the data
 * @property {string} name
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
 * @property {string} format Format of this layer. See individual providers to check which formats are supported for a given layer type.
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
 *   protocol:   'xyz',
 *   id:         'OPENSM',
 *   fx: 2.5,
 *   url:  'http://b.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png',
 *   format: 'image/png',
 *   options: {
 *       attribution : {
 *           name: 'OpenStreetMap',
 *           url: 'http://www.openstreetmap.org/',
 *       },
 *       tileMatrixSet: 'PM',
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
    layer = _preprocessLayer(this, layer, provider, parentLayer);
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

    if (layer.object3d && !layer.object3d.parent && layer.object3d !== this.scene) {
        this.scene.add(layer.object3d);
    }

    if (this._allLayersAreReadyCallback) {
        // re-arm readyCallbacl
        this.removeFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, this._allLayersAreReadyCallback);
        this._allLayersAreReadyCallback = null;
    }

    return layer.whenReady.then((layer) => {
        this.notifyChange(false);

        if (!this._allLayersAreReadyCallback) {
            this._allLayersAreReadyCallback = () => {
                if (this.mainLoop.scheduler.commandsWaitingExecutionCount() == 0 &&
                    this.mainLoop.renderingState == RENDERING_PAUSED) {
                    this.dispatchEvent({ type: VIEW_EVENTS.LAYERS_INITIALIZED });
                    this.removeFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, this._allLayersAreReadyCallback);
                    this._allLayersAreReadyCallback = null;
                }
            };
            this.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, this._allLayersAreReadyCallback);
        }

        return layer;
    });
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
 * @name FrameRequester
 * @function
 *
 * @description
 * Method that will be called each time the <code>MainLoop</code> updates. This
 * function will be given as parameter the delta (in ms) between this update and
 * the previous one, and whether or not we just started to render again. This
 * update is considered as the "next" update if <code>view.notifyChange</code>
 * was called during a precedent update. If <code>view.notifyChange</code> has
 * been called by something else (other micro/macrotask, UI events etc...), then
 * this update is considered as being the "first". It can also receive optional
 * arguments, depending on the attach point of this function.  Currently only
 * <code>BEFORE_LAYER_UPDATE / AFTER_LAYER_UPDATE</code> attach points provide
 * an additional argument: the layer being updated.
 * <br><br>
 *
 * This means that if a <code>frameRequester</code> function wants to animate something, it
 * should keep on calling <code>view.notifyChange</code> until its task is done.
 * <br><br>
 *
 * Implementors of <code>frameRequester</code> should keep in mind that this
 * function will be potentially called at each frame, thus care should be given
 * about performance.
 * <br><br>
 *
 * Typical frameRequesters are controls, module wanting to animate moves or UI
 * elements etc... Basically anything that would want to call
 * requestAnimationFrame.
 *
 * @param {number} dt
 * @param {boolean} updateLoopRestarted
 * @param {...*} args
 */
/**
 * Add a frame requester to this view.
 *
 * FrameRequesters can activate the MainLoop update by calling view.notifyChange.
 *
 * @param {String} when - decide when the frameRequester should be called during
 * the update cycle. Can be any of {@link MAIN_LOOP_EVENTS}.
 * @param {FrameRequester} frameRequester - this function will be called at each
 * MainLoop update with the time delta between last update, or 0 if the MainLoop
 * has just been relaunched.
 */
View.prototype.addFrameRequester = function addFrameRequester(when, frameRequester) {
    if (typeof frameRequester !== 'function') {
        throw new Error('frameRequester must be a function');
    }

    if (!this._frameRequesters[when]) {
        this._frameRequesters[when] = [frameRequester];
    } else {
        this._frameRequesters[when].push(frameRequester);
    }
};

/**
 * Remove a frameRequester.
 *
 * @param {String} when - attach point of this requester. Can be any of
 * {@link MAIN_LOOP_EVENTS}.
 * @param {FrameRequester} frameRequester
 */
View.prototype.removeFrameRequester = function removeFrameRequester(when, frameRequester) {
    const index = this._frameRequesters[when].indexOf(frameRequester);
    if (index >= 0) {
        this._frameRequesters[when].splice(this._frameRequesters[when].indexOf(frameRequester), 1);
    } else {
        console.error('Invalid call to removeFrameRequester: frameRequester isn\'t registered');
    }
};

/**
 * Execute a frameRequester.
 *
 * @param {String} when - attach point of this (these) requester(s). Can be any
 * of {@link MAIN_LOOP_EVENTS}.
 * @param {Number} dt - delta between this update and the previous one
 * @param {boolean} updateLoopRestarted
 * @param {...*} args - optional arguments
 */
View.prototype.execFrameRequesters = function execFrameRequesters(when, dt, updateLoopRestarted, ...args) {
    if (!this._frameRequesters[when]) {
        return;
    }

    for (const frameRequester of this._frameRequesters[when]) {
        if (frameRequester.update) {
            frameRequester.update(dt, updateLoopRestarted, args);
        } else {
            frameRequester(dt, updateLoopRestarted, args);
        }
    }
};

const _eventCoords = new Vector2();
/**
 * Extract view coordinates from a mouse-event / touch-event
 * @param {event} event - event can be a MouseEvent or a TouchEvent
 * @param {number} touchIdx - finger index when using a TouchEvent (default: 0)
 * @return {THREE.Vector2} - view coordinates (in pixels, 0-0 = top-left of the View)
 */
View.prototype.eventToViewCoords = function eventToViewCoords(event, touchIdx = 0) {
    if (event.touches === undefined || !event.touches.length) {
        return _eventCoords.set(event.offsetX, event.offsetY);
    } else {
        const br = this.mainLoop.gfxEngine.renderer.domElement.getBoundingClientRect();
        return _eventCoords.set(
            event.touches[touchIdx].clientX - br.x,
            event.touches[touchIdx].clientY - br.y);
    }
};

/**
 * Extract normalized coordinates (NDC) from a mouse-event / touch-event
 * @param {event} event - event can be a MouseEvent or a TouchEvent
 * @param {number} touchIdx - finger index when using a TouchEvent (default: 0)
 * @return {THREE.Vector2} - NDC coordinates (x and y are [-1, 1])
 */
View.prototype.eventToNormalizedCoords = function eventToNormalizedCoords(event, touchIdx = 0) {
    return this.viewToNormalizedCoords(this.eventToViewCoords(event, touchIdx));
};

/**
 * Convert view coordinates to normalized coordinates (NDC)
 * @param {Vector2} viewCoords (in pixels, 0-0 = top-left of the View)
 * @return {THREE.Vector2} - NDC coordinates (x and y are [-1, 1])
 */
View.prototype.viewToNormalizedCoords = function viewToNormalizedCoords(viewCoords) {
    _eventCoords.x = 2 * (viewCoords.x / this.camera.width) - 1;
    _eventCoords.y = -2 * (viewCoords.y / this.camera.height) + 1;
    return _eventCoords;
};

/**
 * Convert NDC coordinates to view coordinates
 * @param {Vector2} ndcCoords
 * @return {THREE.Vector2} - view coordinates (in pixels, 0-0 = top-left of the View)
 */
View.prototype.normalizedToViewCoords = function normalizedToViewCoords(ndcCoords) {
    _eventCoords.x = (ndcCoords.x + 1) * 0.5 * this.camera.width;
    _eventCoords.y = (ndcCoords.y - 1) * -0.5 * this.camera.height;
    return _eventCoords;
};

function layerIdToLayer(view, layerId) {
    const lookup = view.getLayers(l => l.id == layerId);
    if (!lookup.length) {
        throw new Error(`Invalid layer id used as where argument (value = ${layerId})`);
    }
    return lookup[0];
}

/**
 * Return objects from some layers/objects3d under the mouse in this view.
 *
 * @param {Object} mouseOrEvt - mouse position in window coordinates (0, 0 = top-left)
 * or MouseEvent or TouchEvent
 * @param {...*} where - where to look for objects. Can be either: empty (= look
 * in all layers with type == 'geometry'), layer ids or layers or a mix of all
 * the above.
 * @return {Array} - an array of objects. Each element contains at least an object
 * property which is the Object3D under the cursor. Then depending on the queried
 * layer/source, there may be additionnal properties (coming from THREE.Raycaster
 * for instance).
 *
 * @example
 * view.pickObjectsAt({ x, y })
 * view.pickObjectsAt({ x, y }, 'wfsBuilding')
 * view.pickObjectsAt({ x, y }, 'wfsBuilding', myLayer)
 */
View.prototype.pickObjectsAt = function pickObjectsAt(mouseOrEvt, ...where) {
    const results = [];
    const sources = where.length == 0 ?
        this.getLayers(l => l.type == 'geometry') :
        [...where];

    const mouse = (mouseOrEvt instanceof Event) ? this.eventToViewCoords(mouseOrEvt) : mouseOrEvt;

    for (const source of sources) {
        if (source instanceof GeometryLayer ||
            source instanceof Layer ||
            typeof (source) === 'string') {
            const layer = (typeof (source) === 'string') ?
                layerIdToLayer(this, source) :
                source;

            // does this layer have a custom picking function?
            if (layer.pickObjectsAt) {
                results.splice(
                    results.length, 0,
                    ...layer.pickObjectsAt(this, mouse));
            } else {
                //   - it hasn't: this layer is attached to another one
                let parentLayer;
                this.getLayers((l, p) => {
                    if (l.id == layer.id) {
                        parentLayer = p;
                    }
                });

                // raycast using parent layer object3d
                const obj = Picking.pickObjectsAt(
                    this,
                    mouse,
                    parentLayer.object3d);

                // then filter the results
                for (const o of obj) {
                    if (o.layer === layer.id) {
                        results.push(o);
                    }
                }
            }
        } else if (source instanceof Object3D) {
            Picking.pickObjectsAt(
                this,
                mouse,
                source,
                results);
        } else {
            throw new Error(`Invalid where arg (value = ${where}). Expected layers, layer ids or Object3Ds`);
        }
    }

    return results;
};

export default View;
