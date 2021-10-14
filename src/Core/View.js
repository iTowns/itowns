import * as THREE from 'three';
import Camera from 'Renderer/Camera';
import MainLoop, { MAIN_LOOP_EVENTS, RENDERING_PAUSED } from 'Core/MainLoop';
import Capabilities from 'Core/System/Capabilities';
import { COLOR_LAYERS_ORDER_CHANGED } from 'Renderer/ColorLayersOrdering';
import c3DEngine from 'Renderer/c3DEngine';
import RenderMode from 'Renderer/RenderMode';
import CRS from 'Core/Geographic/Crs';
import Coordinates from 'Core/Geographic/Coordinates';
import FeaturesUtils from 'Utils/FeaturesUtils';
import { getMaxColorSamplerUnitsCount } from 'Renderer/LayeredMaterial';
import Scheduler from 'Core/Scheduler/Scheduler';
import Picking from 'Core/Picking';
import LabelLayer from 'Layer/LabelLayer';

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
    LAYER_REMOVED: 'layer-removed',
    LAYER_ADDED: 'layer-added',
    INITIALIZED: 'initialized',
    COLOR_LAYERS_ORDER_CHANGED,
};

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

function _preprocessLayer(view, layer, parentLayer) {
    const source = layer.source;
    if (parentLayer && !layer.extent) {
        layer.extent = parentLayer.extent;
        if (source && !source.extent) {
            source.extent = parentLayer.extent;
        }
    }

    if (layer.isGeometryLayer) {
        if (parentLayer) {
            // layer.threejsLayer *must* be assigned before preprocessing,
            // because TileProvider.preprocessDataLayer function uses it.
            layer.threejsLayer = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
        }
        layer.defineLayerProperty('visible', true, () => _syncGeometryLayerVisibility(layer, view));
        _syncGeometryLayerVisibility(layer, view);
        // Find crs projection layer, this is projection destination
        layer.crs = view.referenceCrs;
    } else if (!layer.crs) {
        if (parentLayer && parentLayer.tileMatrixSets && parentLayer.tileMatrixSets.includes(CRS.formatToTms(source.crs))) {
            layer.crs = source.crs;
        } else {
            layer.crs = parentLayer && parentLayer.extent.crs;
        }
    }

    if (layer.isLabelLayer) {
        view.mainLoop.gfxEngine.label2dRenderer.registerLayer(layer);
    } else if (layer.labelEnabled || layer.addLabelLayer) {
        if (layer.labelEnabled) {
            // eslint-disable-next-line no-console
            console.info('layer.labelEnabled is deprecated use addLabelLayer, instead of');
        }
        // Because the features are shared between layer and labelLayer.
        layer.buildExtent = true;
        const labelLayer = new LabelLayer(`${layer.id}-label`, {
            source,
            style: layer.style,
            zoom: layer.zoom,
            crs: source.crs,
            visible: layer.visible,
        });

        layer.addEventListener('visible-property-changed', () => {
            labelLayer.visible = layer.visible;
        });

        const removeLabelLayer = (e) => {
            if (e.layerId === layer.id) {
                view.removeLayer(labelLayer.id);
            }
            view.removeEventListener(VIEW_EVENTS.LAYER_REMOVED, removeLabelLayer);
        };

        view.addEventListener(VIEW_EVENTS.LAYER_REMOVED, removeLabelLayer);

        layer.whenReady = layer.whenReady.then(() => {
            view.addLayer(labelLayer);
            return layer;
        });
    }

    return layer;
}
const _eventCoords = new THREE.Vector2();
const matrix = new THREE.Matrix4();
const screen = new THREE.Vector2();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();
const positionVector = new THREE.Vector3();
const coordinates = new Coordinates('EPSG:4326');
const viewers = [];
// Size of the camera frustrum, in meters
let screenMeters;

class View extends THREE.EventDispatcher {
    /**
     * Constructs an Itowns View instance
     *
     * @example <caption><b>Create a view with a custom Three.js camera.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * var customCamera = itowns.THREE.PerspectiveCamera();
     * var view = itowns.View('EPSG:4326', viewerDiv, { camera: { cameraThree: customCamera } });
     *
     * @example <caption><b>Create a view with an orthographic camera, and grant it with Three.js custom controls.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * var view = itowns.View('EPSG:4326', viewerDiv, { camera: { type: itowns.CAMERA_TYPE.ORTHOGRAPHIC } });
     * var customControls = itowns.THREE.OrbitControls(view.camera.camera3D, viewerDiv);
     *
     * @example <caption><b>Enable WebGl 1.0 instead of WebGl 2.0.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const extent = new Extent('EPSG:3946', 1837816.94334, 1847692.32501, 5170036.4587, 5178412.82698);
     * var view = new itowns.View('EPSG:4326', viewerDiv, {  renderer: { isWebGL2: false } });
     *
     * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
     * @param {HTMLElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
     * @param {Object=} options - Optional properties.
     * @param {object} [options.camera] - Options for the camera associated to the view. See {@link Camera} options.
     * @param {?MainLoop} options.mainLoop - {@link MainLoop} instance to use, otherwise a default one will be constructed
     * @param {?(WebGLRenderer|object)} options.renderer - {@link WebGLRenderer} instance to use, otherwise
     * a default one will be constructed. In this case, if options.renderer is an object, it will be used to
     * configure the renderer (see {@link c3DEngine}.  If not present, a new &lt;canvas> will be created and
     * added to viewerDiv (mutually exclusive with mainLoop)
     * @param {boolean} [options.renderer.isWebGL2=true] - enable webgl 2.0 for THREE.js.
     * @param {?Scene} [options.scene3D] - [THREE.Scene](https://threejs.org/docs/#api/en/scenes/Scene) instance to use, otherwise a default one will be constructed
     * @param {?Color} options.diffuse - [THREE.Color](https://threejs.org/docs/?q=color#api/en/math/Color) Diffuse color terrain material.
     * This color is applied to terrain if there isn't color layer on terrain extent (by example on pole).
     *
     * @constructor
     */
    constructor(crs, viewerDiv, options = {}) {
        if (!viewerDiv) {
            throw new Error('Invalid viewerDiv parameter (must non be null/undefined)');
        }

        super();

        this.domElement = viewerDiv;

        this.referenceCrs = crs;
        coordinates.crs = crs;

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
            options.camera);

        this._frameRequesters = { };
        this._layers = [];

        window.addEventListener('resize', () => this.resize(), false);

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

        this.camera.resize(this.domElement.clientWidth, this.domElement.clientHeight);

        const fn = () => {
            this.removeEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
            this.dispatchEvent({ type: VIEW_EVENTS.INITIALIZED });
        };

        this.addEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);

        this._fullSizeDepthBuffer = new Uint8Array(4 * this.camera.width * this.camera.height);
        this._pixelDepthBuffer = new Uint8Array(4);

        // Indicates that view's domElement can be focused (the negative value indicates that domElement can't be
        // focused sequentially using tab key). Focus is needed to capture some key events.
        this.domElement.tabIndex = -1;
        // Set focus on view's domElement.
        this.domElement.focus();

        // push all viewer to keep source.cache
        viewers.push(this);
    }

    /**
     * Dispose viewer before delete it.
     *
     * Method dispose all viewer objects
     * - remove control
     * - remove all layers
     * - remove all frame requester
     * - remove all events
     */
    dispose() {
        const id = viewers.indexOf(this);
        if (id == -1) {
            console.warn('View already disposed');
            return;
        }
        // controls dispose
        if (this.controls && this.controls.dispose) {
            this.controls.dispose();
        }
        // remove alls frameRequester
        this.removeAllFrameRequesters();
        // remove alls events
        this.removeAllEvents();
        // remove alls layers
        const layers = this.getLayers(l => !l.isTiledGeometryLayer && !l.isAtmosphere);
        for (const layer of layers) {
            this.removeLayer(layer.id);
        }
        const atmospheres = this.getLayers(l => l.isAtmosphere);
        for (const atmosphere of atmospheres) {
            this.removeLayer(atmosphere.id);
        }
        const tileLayers = this.getLayers(l => l.isTiledGeometryLayer);
        for (const tileLayer of tileLayers) {
            this.removeLayer(tileLayer.id);
        }
        viewers.splice(id, 1);
    }

    /**
     * Add layer in viewer.
     * The layer id must be unique.
     *
     * The `layer.whenReady` is a promise that resolves when
     * the layer is done. This promise is also returned by
     * `addLayer` allowing to chain call.
     *
     * @param {LayerOptions|Layer|GeometryLayer} layer The layer to add in view.
     * @param {Layer=} parentLayer it's the layer to which the layer will be attached.
     * @return {Promise} a promise resolved with the new layer object when it is fully initialized or rejected if any error occurred.
     */
    addLayer(layer, parentLayer) {
        if (!layer || !layer.isLayer) {
            return Promise.reject(new Error('Add Layer type object'));
        }
        const duplicate = this.getLayerById(layer.id);
        if (duplicate) {
            return layer._reject(new Error(`Invalid id '${layer.id}': id already used`));
        }

        layer = _preprocessLayer(this, layer, parentLayer);

        if (parentLayer) {
            if (layer.isColorLayer) {
                const layerColors = this.getLayers(l => l.isColorLayer);
                layer.sequence = layerColors.length;

                const sumColorLayers = parentLayer.countColorLayersTextures(...layerColors, layer);

                if (sumColorLayers <= getMaxColorSamplerUnitsCount()) {
                    parentLayer.attach(layer);
                } else {
                    return layer._reject(new Error(`Cant add color layer ${layer.id}: the maximum layer is reached`));
                }
            } else if (layer.isElevationLayer && layer.source.format == 'image/x-bil;bits=32') {
                layer.source.networkOptions.isWebGL2 = this.mainLoop.gfxEngine.renderer.capabilities.isWebGL2;
                parentLayer.attach(layer);
            } else {
                parentLayer.attach(layer);
            }
        } else {
            if (typeof (layer.update) !== 'function') {
                return layer._reject(new Error('Cant add GeometryLayer: missing a update function'));
            }
            if (typeof (layer.preUpdate) !== 'function') {
                return layer._reject(new Error('Cant add GeometryLayer: missing a preUpdate function'));
            }

            this._layers.push(layer);
        }

        if (layer.object3d && !layer.object3d.parent && layer.object3d !== this.scene) {
            this.scene.add(layer.object3d);
        }

        Promise.all(layer._promises).then(() => {
            layer._resolve();
            this.notifyChange(parentLayer || layer, false);
            if (!this._frameRequesters[MAIN_LOOP_EVENTS.UPDATE_END] ||
                !this._frameRequesters[MAIN_LOOP_EVENTS.UPDATE_END].includes(this._allLayersAreReadyCallback)) {
                this.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, this._allLayersAreReadyCallback);
            }
            this.dispatchEvent({
                type: VIEW_EVENTS.LAYER_ADDED,
                layerId: layer.id,
            });
        }, layer._reject);

        return layer.whenReady;
    }

    /**
     * Removes a specific imagery layer from the current layer list. This removes layers inserted with attach().
     * @example
     * view.removeLayer('layerId');
     * @param      {string}   layerId      The identifier
     * @return     {boolean}
     */
    removeLayer(layerId) {
        const layer = this.getLayerById(layerId);
        if (layer) {
            const parentLayer = layer.parent;

            // Remove and dispose all nodes
            layer.delete();

            // Detach layer if it's attached
            if (parentLayer && !parentLayer.detach(layer)) {
                throw new Error(`Error to detach ${layerId} from ${parentLayer.id}`);
            } else if (parentLayer == undefined) {
                // Remove layer from viewer
                this._layers.splice(this._layers.findIndex(l => l.id == layerId), 1);
            }
            if (layer.isColorLayer) {
                // Update color layers sequence
                const imageryLayers = this.getLayers(l => l.isColorLayer);
                for (const color of imageryLayers) {
                    if (color.sequence > layer.sequence) {
                        color.sequence--;
                    }
                }
            }

            // Remove unused cache in all viewers

            // count of times the source is used in all viewer
            let sharedSourceCount = 0;
            for (const view of viewers) {
                // add count of times the source is used in other layers
                sharedSourceCount += view.getLayers(l => l.source.uid == layer.source.uid && l.crs == layer.crs).length;
            }
            // if sharedSourceCount equals to 0 so remove unused cache for this CRS
            layer.source.onLayerRemoved({ unusedCrs: sharedSourceCount == 0 ? layer.crs : undefined });

            this.notifyChange(this.camera);

            this.dispatchEvent({
                type: VIEW_EVENTS.LAYER_REMOVED,
                layerId,
            });

            return true;
        } else {
            throw new Error(`${layerId} doesn't exist`);
        }
    }

    /**
     * Notifies the scene it needs to be updated due to changes exterior to the
     * scene itself (e.g. camera movement).
     * non-interactive events (e.g: texture loaded)
     * @param {*} changeSource
     * @param {boolean} needsRedraw - indicates if notified change requires a full scene redraw.
     */
    notifyChange(changeSource = undefined, needsRedraw = true) {
        if (changeSource) {
            this._changeSources.add(changeSource);
            if ((changeSource.isTileMesh || changeSource.isCamera)) {
                this._fullSizeDepthBuffer.needsUpdate = true;
            }
        }
        this.mainLoop.scheduleViewUpdate(this, needsRedraw);
    }

    /**
     * Get all layers, with an optionnal filter applied.
     * The filter method will be called with 2 args:
     *   - 1st: current layer
     *   - 2nd: (optional) the geometry layer to which the current layer is attached
     * @example
     * // get all layers
     * view.getLayers();
     * // get all color layers
     * view.getLayers(layer => layer.isColorLayer);
     * // get all elevation layers
     * view.getLayers(layer => layer.isElevationLayer);
     * // get all geometry layers
     * view.getLayers(layer => layer.isGeometryLayer);
     * // get one layer with id
     * view.getLayers(layer => layer.id === 'itt');
     * @param {function(Layer):boolean} filter
     * @returns {Array<Layer>}
     */
    getLayers(filter) {
        const result = [];
        for (const layer of this._layers) {
            if (!filter || filter(layer)) {
                result.push(layer);
            }
            if (layer.attachedLayers) {
                for (const attached of layer.attachedLayers) {
                    if (!filter || filter(attached, layer)) {
                        result.push(attached);
                    }
                }
            }
        }
        return result;
    }

    /**
     * Gets the layer by identifier.
     *
     * @param {String}  layerId  The layer identifier
     * @return {Layer}  The layer by identifier.
     */

    getLayerById(layerId) {
        return this.getLayers(l => l.id === layerId)[0];
    }

    /**
     * @name FrameRequester
     * @function
     *
     * @description
     * Method that will be called each time the `MainLoop` updates. This function
     * will be given as parameter the delta (in ms) between this update and the
     * previous one, and whether or not we just started to render again. This update
     * is considered as the "next" update if `view.notifyChange` was called during a
     * precedent update. If `view.notifyChange` has been called by something else
     * (other micro/macrotask, UI events etc...), then this update is considered as
     * being the "first". It can also receive optional arguments, depending on the
     * attach point of this function. Currently only `BEFORE_LAYER_UPDATE /
     * AFTER_LAYER_UPDATE` attach points provide an additional argument: the layer
     * being updated.
     * <br><br>
     *
     * This means that if a `frameRequester` function wants to animate something, it
     * should keep on calling `view.notifyChange` until its task is done.
     * <br><br>
     *
     * Implementors of `frameRequester` should keep in mind that this function will
     * be potentially called at each frame, thus care should be given about
     * performance.
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
    addFrameRequester(when, frameRequester) {
        if (typeof frameRequester !== 'function') {
            throw new Error('frameRequester must be a function');
        }

        if (!this._frameRequesters[when]) {
            this._frameRequesters[when] = [frameRequester];
        } else {
            this._frameRequesters[when].push(frameRequester);
        }
    }

    /**
     * Remove a frameRequester.
     * The effective removal will happen either later; at worst it'll be at
     * the beginning of the next frame.
     *
     * @param {String} when - attach point of this requester. Can be any of
     * {@link MAIN_LOOP_EVENTS}.
     * @param {FrameRequester} frameRequester
     */
    removeFrameRequester(when, frameRequester) {
        if (this._frameRequesters[when].includes(frameRequester)) {
            this._delayedFrameRequesterRemoval.push({ when, frameRequester });
        } else {
            console.error('Invalid call to removeFrameRequester: frameRequester isn\'t registered');
        }
    }

    /**
     * Removes all frame requesters.
     */
    removeAllFrameRequesters() {
        for (const when in this._frameRequesters) {
            if (Object.prototype.hasOwnProperty.call(this._frameRequesters, when)) {
                const frameRequesters = this._frameRequesters[when];
                for (const frameRequester of frameRequesters) {
                    this.removeFrameRequester(when, frameRequester);
                }
            }
        }
        this._executeFrameRequestersRemovals();
    }

    /**
     * Removes all viewer events.
     */
    removeAllEvents() {
        if (this._listeners === undefined) {
            return;
        }

        for (const type in this._listeners) {
            if (Object.prototype.hasOwnProperty.call(this._listeners, type)) {
                delete this._listeners[type];
            }
        }

        this._listeners = undefined;
    }

    _executeFrameRequestersRemovals() {
        for (const toDelete of this._delayedFrameRequesterRemoval) {
            const index = this._frameRequesters[toDelete.when].indexOf(toDelete.frameRequester);
            if (index >= 0) {
                this._frameRequesters[toDelete.when].splice(index, 1);
            } else {
                console.warn('FrameReq has already been removed');
            }
        }
        this._delayedFrameRequesterRemoval.length = 0;
    }

    /**
     * Execute a frameRequester.
     *
     * @param {String} when - attach point of this (these) requester(s). Can be any
     * of {@link MAIN_LOOP_EVENTS}.
     * @param {Number} dt - delta between this update and the previous one
     * @param {boolean} updateLoopRestarted
     * @param {...*} args - optional arguments
     */
    execFrameRequesters(when, dt, updateLoopRestarted, ...args) {
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
    }

    /**
     * Extract view coordinates from a mouse-event / touch-event
     * @param {event} event - event can be a MouseEvent or a TouchEvent
     * @param {THREE.Vector2} target - the target to set the view coords in
     * @param {number} [touchIdx=0] - finger index when using a TouchEvent
     * @return {THREE.Vector2} - view coordinates (in pixels, 0-0 = top-left of the View)
     */
    eventToViewCoords(event, target = _eventCoords, touchIdx = 0) {
        const br = this.domElement.getBoundingClientRect();

        if (event.touches === undefined || !event.touches.length) {
            const targetBoundingRect = event.target.getBoundingClientRect();
            return target.set(targetBoundingRect.x + event.offsetX - br.x,
                targetBoundingRect.y + event.offsetY - br.y);
        } else {
            return target.set(event.touches[touchIdx].clientX - br.x,
                event.touches[touchIdx].clientY - br.y);
        }
    }

    /**
     * Extract normalized coordinates (NDC) from a mouse-event / touch-event
     * @param {event} event - event can be a MouseEvent or a TouchEvent
     * @param {number} touchIdx - finger index when using a TouchEvent (default: 0)
     * @return {THREE.Vector2} - NDC coordinates (x and y are [-1, 1])
     */
    eventToNormalizedCoords(event, touchIdx = 0) {
        return this.viewToNormalizedCoords(this.eventToViewCoords(event, _eventCoords, touchIdx));
    }

    /**
     * Convert view coordinates to normalized coordinates (NDC)
     * @param {THREE.Vector2} viewCoords (in pixels, 0-0 = top-left of the View)
     * @param {THREE.Vector2} target
     * @return {THREE.Vector2} - NDC coordinates (x and y are [-1, 1])
     */
    viewToNormalizedCoords(viewCoords, target = _eventCoords) {
        target.x = 2 * (viewCoords.x / this.camera.width) - 1;
        target.y = -2 * (viewCoords.y / this.camera.height) + 1;
        return target;
    }

    /**
     * Convert NDC coordinates to view coordinates
     * @param {THREE.Vector2} ndcCoords
     * @return {THREE.Vector2} - view coordinates (in pixels, 0-0 = top-left of the View)
     */
    normalizedToViewCoords(ndcCoords) {
        _eventCoords.x = (ndcCoords.x + 1) * 0.5 * this.camera.width;
        _eventCoords.y = (ndcCoords.y - 1) * -0.5 * this.camera.height;
        return _eventCoords;
    }

    /**
     * Searches for objects in {@link GeometryLayer} and specified
     * `THREE.Object3D`, under the mouse or at a specified coordinates, in this
     * view.
     *
     * @param {Object} mouseOrEvt - Mouse position in window coordinates (from
     * the top left corner of the window) or `MouseEvent` or `TouchEvent`.
     * @param {number} [radius=0] - The picking will happen in a circle centered
     * on mouseOrEvt. This is the radius of this circle, in pixels.
     * @param {...GeometryLayer|string|Object3D} [where] - Where to look for
     * objects. It can be anything of {@link GeometryLayer}, IDs of layers, or
     * `THREE.Object3D`. If no location is specified, it will query on all
     * {@link GeometryLayer} present in this `View`.
     *
     * @return {Object[]} - An array of objects. Each element contains at least
     * an object property which is the `THREE.Object3D` under the cursor. Then
     * depending on the queried layer/source, there may be additionnal
     * properties (coming from `THREE.Raycaster` for instance).
     *
     * @example
     * view.pickObjectsAt({ x, y })
     * view.pickObjectsAt({ x, y }, 1, 'wfsBuilding')
     * view.pickObjectsAt({ x, y }, 3, 'wfsBuilding', myLayer)
     */
    pickObjectsAt(mouseOrEvt, radius = 0, ...where) {
        const sources = [];

        where = where.length == 0 ? this.getLayers(l => l.isGeometryLayer) : where;
        where.forEach((l) => {
            if (typeof l === 'string') {
                l = this.getLayerById(l);
            }

            if (l && (l.isGeometryLayer || l.isObject3D)) {
                sources.push(l);
            }
        });

        if (sources.length == 0) {
            return [];
        }

        const results = [];
        const mouse = (mouseOrEvt instanceof Event) ? this.eventToViewCoords(mouseOrEvt) : mouseOrEvt;

        for (const source of sources) {
            if (source.isGeometryLayer) {
                if (!source.ready) {
                    console.warn('view.pickObjectAt : layer is not ready : ', source);
                    continue;
                }

                source.pickObjectsAt(this, mouse, radius, results);
            } else {
                Picking.pickObjectsAt(this, mouse, radius, source, results);
            }
        }

        return results;
    }

    /**
     * Return the current zoom scale at the central point of the view. This
     * function compute the scale of a map.
     *
     * @param {number} pitch - Screen pitch, in millimeters ; 0.28 by default
     *
     * @return {number} The zoom scale.
     */
    getScale(pitch = 0.28) {
        return this.getScaleFromDistance(pitch, this.getDistanceFromCamera());
    }

    getScaleFromDistance(pitch = 0.28, distance = 1) {
        pitch /= 1000;
        const fov = THREE.MathUtils.degToRad(this.camera.camera3D.fov);
        const unit = this.camera.height / (2 * distance * Math.tan(fov * 0.5));
        return pitch * unit;
    }

    /**
     * Given a screen coordinates, get the distance between the projected
     * coordinates and the camera associated to this view.
     *
     * @param {THREE.Vector2} [screenCoord] - The screen coordinate to get the
     * distance at. By default this is the middle of the screen.
     *
     * @return {number} The distance in meters.
     */
    getDistanceFromCamera(screenCoord) {
        this.getPickingPositionFromDepth(screenCoord, positionVector);
        return this.camera.camera3D.position.distanceTo(positionVector);
    }

    /**
     * Get, for a specific screen coordinate, the projected distance on the
     * surface of the main layer of the view.
     *
     * @param {number} [pixels=1] - The size, in pixels, to get in meters.
     * @param {THREE.Vector2} [screenCoord] - The screen coordinate to get the
     * projected distance at. By default, this is the middle of the screen.
     *
     * @return {number} The projected distance in meters.
     */
    getPixelsToMeters(pixels = 1, screenCoord) {
        if (this.camera.camera3D.isOrthographicCamera) {
            screenMeters = (this.camera.camera3D.right - this.camera.camera3D.left) / this.camera.camera3D.zoom;
            return pixels * screenMeters / this.camera.width;
        }
        return this.getPixelsToMetersFromDistance(pixels, this.getDistanceFromCamera(screenCoord));
    }

    getPixelsToMetersFromDistance(pixels = 1, distance = 1) {
        return pixels * distance / this.camera._preSSE;
    }

    /**
     * Get, for a specific screen coordinate, the size in pixels of a projected
     * distance on the surface of the main layer of the view.
     *
     * @param {number} [meters=1] - The size, in meters, to get in pixels.
     * @param {THREE.Vector2} [screenCoord] - The screen coordinate to get the
     * projected distance at. By default, this is the middle of the screen.
     *
     * @return {number} The projected distance in pixels.
     */
    getMetersToPixels(meters = 1, screenCoord) {
        if (this.camera.camera3D.isOrthographicCamera) {
            screenMeters = (this.camera.camera3D.right - this.camera.camera3D.left) / this.camera.camera3D.zoom;
            return meters * this.camera.width / screenMeters;
        }
        return this.getMetersToPixelsFromDistance(meters, this.getDistanceFromCamera(screenCoord));
    }

    getMetersToPixelsFromDistance(meters = 1, distance = 1) {
        return this.camera._preSSE * meters / distance;
    }

    /**
     * Searches for {@link Feature} in {@link ColorLayer}, under the mouse of at
     * a specified coordinates, in this view.
     *
     * @param {Object} mouseOrEvt - Mouse position in window coordinates (from
     * the top left corner of the window) or `MouseEvent` or `TouchEvent`.
     * @param {number} [radius=3] - The picking will happen in a circle centered
     * on mouseOrEvt. This is the radius of this circle, in pixels.
     * @param {...ColorLayer|GeometryLayer|string} [where] - The layers to look
     * into. If not specified, all {@link ColorLayer} and {@link GeometryLayer}
     * layers of this view will be looked in.
     *
     * @return {Object} - An object, with a property per layer. For example,
     * looking for features on layers `wfsBuilding` and `wfsRoads` will give an
     * object like `{ wfsBuilding: [...], wfsRoads: [] }`. Each property is made
     * of an array, that can be empty or filled with found features.
     *
     * @example
     * view.pickFeaturesAt({ x, y });
     * view.pickFeaturesAt({ x, y }, 1, 'wfsBuilding');
     * view.pickFeaturesAt({ x, y }, 3, 'wfsBuilding', myLayer);
     */
    pickFeaturesAt(mouseOrEvt, radius = 3, ...where) {
        if (Array.isArray(where[0])) {
            console.warn('Deprecated: the ...where argument of View#pickFeaturesAt should not be an array anymore, but a list: use the spread operator if needed.');
            where = where[0];
        }

        const layers = [];
        const result = {};

        where = where.length == 0 ? this.getLayers(l => l.isColorLayer || l.isGeometryLayer) : where;
        where.forEach((l) => {
            if (typeof l === 'string') {
                l = this.getLayerById(l);
            }

            if (l && l.isLayer) {
                result[l.id] = [];
                if (l.isColorLayer) { layers.push(l.id); }
            }
        });

        // Get the mouse coordinates to the correct system
        const mouse = (mouseOrEvt instanceof Event) ? this.eventToViewCoords(mouseOrEvt, _eventCoords) : mouseOrEvt;
        const objects = this.pickObjectsAt(mouse, radius, ...where);

        if (objects.length > 0) {
            objects.forEach(o => result[o.layer.id].push(o));
        }

        if (layers.length == 0) {
            return result;
        }

        this.getPickingPositionFromDepth(mouse, positionVector);
        const distance = this.camera.camera3D.position.distanceTo(positionVector);
        coordinates.setFromVector3(positionVector);

        // Get the correct precision; the position variable will be set in this
        // function.
        let precision;
        const precisions = {
            M: this.getPixelsToMetersFromDistance(radius, distance),
            D: 0.001 * radius,
        };

        if (this.isPlanarView) {
            precisions.D = precisions.M;
        } else if (this.getPixelsToDegrees) {
            precisions.D = this.getMetersToDegrees(precisions.M);
        }

        // Get the tile corresponding to where the cursor is
        const tiles = Picking.pickTilesAt(this, mouse, radius, this.tileLayer);

        for (const tile of tiles) {
            if (!tile.object.material) {
                continue;
            }

            for (const materialLayer of tile.object.material.getLayers(layers)) {
                for (const texture of materialLayer.textures) {
                    if (!texture.features) {
                        continue;
                    }

                    precision = CRS.isMetricUnit(texture.features.crs) ? precisions.M : precisions.D;

                    result[materialLayer.id] = result[materialLayer.id].concat(
                        FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, texture.features, precision));
                }
            }
        }

        return result;
    }

    readDepthBuffer(x, y, width, height, buffer) {
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

        const restore = this.tileLayer.level0Nodes.map(n => RenderMode.push(n, RenderMode.MODES.DEPTH));
        buffer = g.renderViewToBuffer(
            { camera: this.camera, scene: this.tileLayer.object3d },
            { x, y, width, height, buffer });
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
    }

    /**
     * Returns the world position (view's crs: referenceCrs) under view coordinates.
     * This position is computed with depth buffer.
     *
     * @param      {THREE.Vector2}  mouse  position in view coordinates (in pixel), if it's null so it's view's center.
     * @param      {THREE.Vector3}  [target=THREE.Vector3()] target. the result will be copied into this Vector3. If not present a new one will be created.
     * @return     {THREE.Vector3}  the world position in view's crs: referenceCrs.
     */

    getPickingPositionFromDepth(mouse, target = new THREE.Vector3()) {
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
            if (this._fullSizeDepthBuffer.needsUpdate) {
                this.readDepthBuffer(0, 0, dim.x, dim.y, this._fullSizeDepthBuffer);
                this._fullSizeDepthBuffer.needsUpdate = false;
            }
            const id = ((dim.y - mouse.y - 1) * dim.x + mouse.x) * 4;
            buffer = this._fullSizeDepthBuffer.slice(id, id + 4);
        } else {
            buffer = this.readDepthBuffer(mouse.x, mouse.y, 1, 1, this._pixelDepthBuffer);
        }

        screen.x = (mouse.x / dim.x) * 2 - 1;
        screen.y = -(mouse.y / dim.y) * 2 + 1;

        if (Capabilities.isLogDepthBufferSupported() && camera.type == 'PerspectiveCamera') {
            // TODO: solve this part with gl_FragCoord_Z and unproject
            // Origin
            ray.origin.copy(camera.position);

            // Direction
            ray.direction.set(screen.x, screen.y, 0.5);
            // Unproject
            matrix.multiplyMatrices(camera.matrixWorld, matrix.copy(camera.projectionMatrix).invert());
            ray.direction.applyMatrix4(matrix);
            ray.direction.sub(ray.origin);

            direction.set(0, 0, 1.0);
            direction.applyMatrix4(matrix);
            direction.sub(ray.origin);

            const angle = direction.angleTo(ray.direction);
            const orthoZ = g.depthBufferRGBAValueToOrthoZ(buffer, camera);
            const length = orthoZ / Math.cos(angle);
            target.addVectors(camera.position, ray.direction.setLength(length));
        } else {
            const gl_FragCoord_Z = g.depthBufferRGBAValueToOrthoZ(buffer, camera);

            target.set(screen.x, screen.y, gl_FragCoord_Z);
            target.unproject(camera);
        }

        camera.layers.mask = prev;

        if (target.length() > 10000000) { return undefined; }

        return target;
    }

    /**
     * Resize the viewer.
     *
     * @param {number} [width=viewerDiv.clientWidth] - The width to resize the
     * viewer with. By default it is the `clientWidth` of the `viewerDiv`.
     * @param {number} [height=viewerDiv.clientHeight] - The height to resize
     * the viewer with. By default it is the `clientHeight` of the `viewerDiv`.
     */
    resize(width, height) {
        if (width == undefined) {
            width = this.domElement.clientWidth;
        }

        if (height == undefined) {
            height = this.domElement.clientHeight;
        }

        this._fullSizeDepthBuffer = new Uint8Array(4 * width * height);
        this.mainLoop.gfxEngine.onWindowResize(width, height);
        this.camera.resize(width, height);
        this.notifyChange(this.camera.camera3D);
    }
}

export default View;
