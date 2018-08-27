/* global window */
import * as THREE from 'three';
import Camera from '../Renderer/Camera';
import MainLoop, { MAIN_LOOP_EVENTS, RENDERING_PAUSED } from './MainLoop';
import c3DEngine from '../Renderer/c3DEngine';
import RendererConstant from '../Renderer/RendererConstant';

import { getMaxColorSamplerUnitsCount } from '../Renderer/LayeredMaterial';

import Layer from '../Layer/Layer';
import ColorLayer from '../Layer/ColorLayer';
import ElevationLayer from '../Layer/ElevationLayer';
import GeometryLayer from '../Layer/GeometryLayer';

import Scheduler from './Scheduler/Scheduler';
import Picking from './Picking';
import WMTSSource from '../Source/WMTSSource';
import WMSSource from '../Source/WMSSource';
import WFSSource from '../Source/WFSSource';
import TMSSource from '../Source/TMSSource';
import StaticSource from '../Source/StaticSource';
import FileSource from '../Source/FileSource';

const supportedSource = new Map([
    ['wmts', WMTSSource],
    ['file', FileSource],
    ['wfs', WFSSource],
    ['wms', WMSSource],
    ['tms', TMSSource],
    ['xyz', TMSSource],
    ['static', StaticSource],
]);

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

    this.scene = options.scene3D || new THREE.Scene();
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
        const newSize = new THREE.Vector2(viewerDiv.clientWidth, viewerDiv.clientHeight);
        this.mainLoop.gfxEngine.onWindowResize(newSize.x, newSize.y);
        this.notifyChange(this.camera.camera3D);
    }, false);

    this._changeSources = new Set();

    if (__DEBUG__) {
        this.isDebugMode = true;
    }

    this._delayedFrameRequesterRemoval = [];

    this._allLayersAreReadyCallback = () => {
        // all layers must be ready
        const allReady = this.getLayers().every(layer => layer.ready);
        if (allReady &&
                this.mainLoop.scheduler.commandsWaitingExecutionCount() == 0 &&
                this.mainLoop.renderingState == RENDERING_PAUSED) {
            this.dispatchEvent({ type: VIEW_EVENTS.LAYERS_INITIALIZED });
            this.removeFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, this._allLayersAreReadyCallback);
        }
    };
}

View.prototype = Object.create(THREE.EventDispatcher.prototype);
View.prototype.constructor = View;

function _createLayerFromConfig(config) {
    switch (config.type) {
        case 'color':
            return new ColorLayer(config.id, config);
        case 'elevation':
            return new ElevationLayer(config.id, config);
        case 'geometry':
            return new GeometryLayer(config.id, new THREE.Group(), config);
        case 'debug':
            return new Layer(config.id, 'debug', config);
        default:
            throw new Error(`Unknown layer type ${config.type}: please
                specify a valid one`);
    }
}

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
    if (!(layer instanceof Layer)) {
        layer = _createLayerFromConfig(layer);
    }

    if (parentLayer && !layer.extent) {
        layer.extent = parentLayer.extent;
        if (layer.source && !layer.source.extent) {
            layer.source.extent = parentLayer.extent;
        }
    }

    if (layer.type == 'geometry' || layer.type == 'debug') {
        if (parentLayer || layer.type == 'debug') {
            // layer.threejsLayer *must* be assigned before preprocessing,
            // because TileProvider.preprocessDataLayer function uses it.
            layer.threejsLayer = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
        }
        layer.defineLayerProperty('visible', true, () => _syncGeometryLayerVisibility(layer, view));
        _syncGeometryLayerVisibility(layer, view);
    // Find projection layer, this is projection destination
        layer.projection = view.referenceCrs;
    } else if (layer.source.tileMatrixSet === 'PM') {
        layer.projection = 'EPSG:3857';
    } else {
        layer.projection = parentLayer.extent.crs();
    }

    if (!layer.whenReady) {
        let providerPreprocessing = Promise.resolve();
        if (provider && provider.preprocessDataLayer) {
            providerPreprocessing = provider.preprocessDataLayer(layer, view, view.mainLoop.scheduler, parentLayer);
            if (!(providerPreprocessing && providerPreprocessing.then)) {
                providerPreprocessing = Promise.resolve();
            }
        } else if (layer.source) {
            const protocol = layer.source.protocol;
            layer.source = new (supportedSource.get(protocol))(layer.source, layer.projection);
            providerPreprocessing = layer.source.whenReady || providerPreprocessing;
        }

        // the last promise in the chain must return the layer
        layer.whenReady = providerPreprocessing.then(() => {
            layer.ready = true;
            return layer;
        });
    }


    return layer;
}

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
 *   id: 'OPENSM',
 *   fx: 2.5,
 *   source: {
 *      protocol:   'xyz',
 *      url:  'http://b.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png',
 *      format: 'image/png',
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
 * @return {Promise} a promise resolved with the new layer object when it is fully initialized or rejected if any error occurred.
 */
View.prototype.addLayer = function addLayer(layer, parentLayer) {
    return new Promise((resolve, reject) => {
        if (!layer) {
            reject(new Error('layer is undefined'));
            return;
        }
        const duplicate = this.getLayers((l => l.id == layer.id));
        if (duplicate.length > 0) {
            reject(new Error(`Invalid id '${layer.id}': id already used`));
            return;
        }

        const protocol = layer.source ? layer.source.protocol : layer.protocol;
        const provider = this.mainLoop.scheduler.getProtocolProvider(protocol);
        if (layer.protocol && !provider) {
            reject(new Error(`${layer.protocol} is not a recognized protocol name.`));
            return;
        }
        layer = _preprocessLayer(this, layer, provider, parentLayer);
        if (parentLayer) {
            if (layer.type == 'color') {
                const layerColors = this.getLayers(l => l.type === 'color');

                const sumColorLayers = parentLayer.countColorLayersTextures(...layerColors, layer);

                if (sumColorLayers <= getMaxColorSamplerUnitsCount()) {
                    parentLayer.attach(layer);
                } else {
                    reject(new Error(`Cant add color layer ${layer.id}: the maximum layer is reached`));
                    return;
                }
            } else {
                parentLayer.attach(layer);
            }
        } else {
            if (typeof (layer.update) !== 'function') {
                reject(new Error('Cant add GeometryLayer: missing a update function'));
                return;
            }
            if (typeof (layer.preUpdate) !== 'function') {
                reject(new Error('Cant add GeometryLayer: missing a preUpdate function'));
                return;
            }

            this._layers.push(layer);
        }

        if (layer.object3d && !layer.object3d.parent && layer.object3d !== this.scene) {
            this.scene.add(layer.object3d);
        }

        layer.whenReady.then((layer) => {
            this.notifyChange(parentLayer || layer, false);
            if (!this._frameRequesters[MAIN_LOOP_EVENTS.UPDATE_END] ||
                    this._frameRequesters[MAIN_LOOP_EVENTS.UPDATE_END].indexOf(this._allLayersAreReadyCallback) == -1) {
                this.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, this._allLayersAreReadyCallback);
            }
            resolve(layer);
        });
    });
};

/**
 * Notifies the scene it needs to be updated due to changes exterior to the
 * scene itself (e.g. camera movement).
 * non-interactive events (e.g: texture loaded)
 * @param {*} changeSource
 * @param {boolean} needsRedraw - indicates if notified change requires a full scene redraw.
 */
View.prototype.notifyChange = function notifyChange(changeSource = undefined, needsRedraw = true) {
    if (changeSource) {
        this._changeSources.add(changeSource);
    }
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
    for (const layer of this._layers) {
        if (!filter || filter(layer)) {
            result.push(layer);
        }
        for (const attached of layer.attachedLayers) {
            if (!filter || filter(attached, layer)) {
                result.push(attached);
            }
        }
    }
    return result;
};

/**
 * @param {Layer} layer
 * @returns {GeometryLayer} the parent layer of the given layer or undefined.
 */
View.prototype.getParentLayer = function getParentLayer(layer) {
    for (const geometryLayer of this._layers) {
        for (const attached of geometryLayer.attachedLayers) {
            if (attached === layer) {
                return geometryLayer;
            }
        }
    }
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
 * The effective removal will happen either later; at worst it'll be at
 * the beginning of the next frame.
 *
 * @param {String} when - attach point of this requester. Can be any of
 * {@link MAIN_LOOP_EVENTS}.
 * @param {FrameRequester} frameRequester
 */
View.prototype.removeFrameRequester = function removeFrameRequester(when, frameRequester) {
    const index = this._frameRequesters[when].indexOf(frameRequester);
    if (index >= 0) {
        this._delayedFrameRequesterRemoval.push({ when, frameRequester });
    } else {
        console.error('Invalid call to removeFrameRequester: frameRequester isn\'t registered');
    }
};

View.prototype._executeFrameRequestersRemovals = function _executeFrameRequestersRemovals() {
    for (const toDelete of this._delayedFrameRequesterRemoval) {
        const index = this._frameRequesters[toDelete.when].indexOf(toDelete.frameRequester);
        if (index >= 0) {
            this._frameRequesters[toDelete.when].splice(index, 1);
        } else {
            console.warn('FrameReq has already been removed');
        }
    }
    this._delayedFrameRequesterRemoval.length = 0;
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

    if (this._delayedFrameRequesterRemoval.length > 0) {
        this._executeFrameRequestersRemovals();
    }

    for (const frameRequester of this._frameRequesters[when]) {
        if (frameRequester.update) {
            frameRequester.update(dt, updateLoopRestarted, args);
        } else {
            frameRequester(dt, updateLoopRestarted, args);
        }
    }
};

const _eventCoords = new THREE.Vector2();
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
 * @param {THREE.Vector2} viewCoords (in pixels, 0-0 = top-left of the View)
 * @return {THREE.Vector2} - NDC coordinates (x and y are [-1, 1])
 */
View.prototype.viewToNormalizedCoords = function viewToNormalizedCoords(viewCoords) {
    _eventCoords.x = 2 * (viewCoords.x / this.camera.width) - 1;
    _eventCoords.y = -2 * (viewCoords.y / this.camera.height) + 1;
    return _eventCoords;
};

/**
 * Convert NDC coordinates to view coordinates
 * @param {THREE.Vector2} ndcCoords
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
 * @param {number} radius - picking will happen in a circle centered on mouseOrEvt. Radius
 * is the radius of this circle, in pixels
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
 * view.pickObjectsAt({ x, y }, 1, 'wfsBuilding')
 * view.pickObjectsAt({ x, y }, 3, 'wfsBuilding', myLayer)
 */
View.prototype.pickObjectsAt = function pickObjectsAt(mouseOrEvt, radius, ...where) {
    const results = [];
    const sources = where.length == 0 ?
        this.getLayers(l => l.type == 'geometry') :
        [...where];
    const mouse = (mouseOrEvt instanceof Event) ? this.eventToViewCoords(mouseOrEvt) : mouseOrEvt;
    radius = radius || 0;

    for (const source of sources) {
        if (source instanceof Layer ||
            typeof (source) === 'string') {
            const layer = (typeof (source) === 'string') ?
                layerIdToLayer(this, source) :
                source;

            const parentLayer = this.getParentLayer(layer);
            if (!parentLayer) {
                const sp = layer.pickObjectsAt(this, mouse, radius);
                // warning: sp might be very large, so we can't use '...sp' (we'll hit
                // 'javascript maximum call stack size exceeded' error) nor
                // Array.prototype.push.apply(result, sp)
                for (let i = 0; i < sp.length; i++) {
                    results.push(sp[i]);
                }
            } else {
                // raycast using parent layer object3d
                const obj = Picking.pickObjectsAt(
                    this,
                    mouse,
                    radius,
                    parentLayer.object3d);

                // then filter the results
                for (const o of obj) {
                    if (o.layer === layer) {
                        results.push(o);
                    }
                }
            }
        } else if (source instanceof THREE.Object3D) {
            Picking.pickObjectsAt(
                this,
                mouse,
                radius,
                source,
                results);
        } else {
            throw new Error(`Invalid where arg (value = ${where}). Expected layers, layer ids or Object3Ds`);
        }
    }

    return results;
};

View.prototype.readDepthBuffer = function readDepthBuffer(x, y, width, height) {
    const g = this.mainLoop.gfxEngine;
    const currentWireframe = this.tileLayer.wireframe;
    const currentOpacity = this.tileLayer.opacity;
    const currentVisibility = this.tileLayer.visible;
    if (currentWireframe) {
        this.tileLayer.wireframe = false;
    }
    if (currentOpacity < 1.0) {
        this.tileLayer.opacity = 1.0;
    }
    if (!currentVisibility) {
        this.tileLayer.visible = true;
    }

    const restore = this.tileLayer.level0Nodes.map(n => n.pushRenderState(RendererConstant.DEPTH));
    const buffer = g.renderViewToBuffer(
        { camera: this.camera, scene: this.tileLayer.object3d },
        { x, y, width, height });
    restore.forEach(r => r());

    if (this.tileLayer.wireframe !== currentWireframe) {
        this.tileLayer.wireframe = currentWireframe;
    }
    if (this.tileLayer.opacity !== currentOpacity) {
        this.tileLayer.opacity = currentOpacity;
    }
    if (this.tileLayer.visible !== currentVisibility) {
        this.tileLayer.visible = currentVisibility;
    }

    return buffer;
};

const matrix = new THREE.Matrix4();
const screen = new THREE.Vector2();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();

/**
 * Returns the world position (view's crs: referenceCrs) under view coordinates.
 * This position is computed with depth buffer.
 *
 * @param      {THREE.Vector2}  mouse  position in view coordinates (in pixel), if it's null so it's view's center.
 * @param      {THREE.Vector3}  [target=THREE.Vector3()] target. the result will be copied into this Vector3. If not present a new one will be created.
 * @return     {THREE.Vector3}  the world position in view's crs: referenceCrs.
 */

View.prototype.getPickingPositionFromDepth = function fnGetPickingPositionFromDepth(mouse, target = new THREE.Vector3()) {
    if (!this.tileLayer || this.tileLayer.level0Nodes.length == 0 || (!this.tileLayer.level0Nodes[0])) {
        target = undefined;
        return;
    }
    const l = this.mainLoop;
    const viewPaused = l.scheduler.commandsWaitingExecutionCount() == 0 && l.renderingState == RENDERING_PAUSED;
    const g = l.gfxEngine;
    const dim = g.getWindowSize();
    const camera = this.camera.camera3D;

    mouse = mouse || dim.clone().multiplyScalar(0.5);
    mouse.x = Math.floor(mouse.x);
    mouse.y = Math.floor(mouse.y);

    // Prepare state
    const prev = camera.layers.mask;
    camera.layers.mask = 1 << this.tileLayer.threejsLayer;

     // Render/Read to buffer
    let buffer;
    if (viewPaused) {
        this._fullSizeDepthBuffer = this._fullSizeDepthBuffer || this.readDepthBuffer(0, 0, dim.x, dim.y);
        const id = ((dim.y - mouse.y - 1) * dim.x + mouse.x) * 4;
        buffer = this._fullSizeDepthBuffer.slice(id, id + 4);
    } else {
        buffer = this.readDepthBuffer(mouse.x, mouse.y, 1, 1);
    }

    screen.x = (mouse.x / dim.x) * 2 - 1;
    screen.y = -(mouse.y / dim.y) * 2 + 1;

    // Origin
    ray.origin.copy(camera.position);

    // Direction
    ray.direction.set(screen.x, screen.y, 0.5);
    // Unproject
    matrix.multiplyMatrices(camera.matrixWorld, matrix.getInverse(camera.projectionMatrix));
    ray.direction.applyMatrix4(matrix);
    ray.direction.sub(ray.origin);

    direction.set(0, 0, 1.0);
    direction.applyMatrix4(matrix);
    direction.sub(ray.origin);

    const angle = direction.angleTo(ray.direction);
    const orthoZ = g.depthBufferRGBAValueToOrthoZ(buffer, camera);
    const length = orthoZ / Math.cos(angle);

    target.addVectors(camera.position, ray.direction.setLength(length));

    camera.layers.mask = prev;

    if (target.length() > 10000000)
        { return undefined; }

    return target;
};

export default View;
