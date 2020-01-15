import * as THREE from 'three';
import Camera from 'Renderer/Camera';
import MainLoop, { MAIN_LOOP_EVENTS, RENDERING_PAUSED } from 'Core/MainLoop';
import { COLOR_LAYERS_ORDER_CHANGED } from 'Renderer/ColorLayersOrdering';
import c3DEngine from 'Renderer/c3DEngine';
import RenderMode from 'Renderer/RenderMode';
import CRS from 'Core/Geographic/Crs';
import Coordinates from 'Core/Geographic/Coordinates';
import FeaturesUtils from 'Utils/FeaturesUtils';

import { getMaxColorSamplerUnitsCount } from 'Renderer/LayeredMaterial';

import Scheduler from 'Core/Scheduler/Scheduler';
import Picking from 'Core/Picking';

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
        // Find projection layer, this is projection destination
        layer.projection = view.referenceCrs;
    } else if (parentLayer.tileMatrixSets.includes(CRS.formatToTms(source.projection))) {
        layer.projection = source.projection;
    } else {
        layer.projection = parentLayer.extent.crs;
    }

    layer.whenReady = layer.whenReady.then(() => {
        layer.ready = true;
        return layer;
    });

    return layer;
}
const _eventCoords = new THREE.Vector2();
const matrix = new THREE.Matrix4();
const screen = new THREE.Vector2();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();
const positionVector = new THREE.Vector3();
const coordinates = new Coordinates('EPSG:4326');

class View extends THREE.EventDispatcher {
    /**
     * Constructs an Itowns View instance
     *
     * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
     * @param {HTMLElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
     * @param {Object=} options - Optional properties.
     * @param {?MainLoop} options.mainLoop - {@link MainLoop} instance to use, otherwise a default one will be constructed
     * @param {?(WebGLRenderer|object)} options.renderer - {@link WebGLRenderer} instance to use, otherwise
     * a default one will be constructed. In this case, if options.renderer is an object, it will be used to
     * configure the renderer (see {@link c3DEngine}.  If not present, a new &lt;canvas> will be created and
     * added to viewerDiv (mutually exclusive with mainLoop)
     * @param {?Scene} options.scene3D - {@link Scene} instance to use, otherwise a default one will be constructed
     * @constructor
     */
    constructor(crs, viewerDiv, options = {}) {
        if (!viewerDiv) {
            throw new Error('Invalid viewerDiv parameter (must non be null/undefined)');
        }

        super();

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
            options);

        this._frameRequesters = { };
        this._layers = [];

        window.addEventListener('resize', () => {
            // If the user gave us a container (<div>) then itowns' size is
            // the container's size. Otherwise we use window' size.
            this.mainLoop.gfxEngine.onWindowResize(viewerDiv.clientWidth, viewerDiv.clientHeight);
            this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);
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

        this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);

        const fn = () => {
            this.removeEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
            this.dispatchEvent({ type: VIEW_EVENTS.INITIALIZED });
        };

        this.addEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);

        this._fullSizeDepthBuffer = null;

        this.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, () => {
            if (this._fullSizeDepthBuffer != null && this._fullSizeDepthBuffer.needsUpdate) {
                // clean depth buffer
                this._fullSizeDepthBuffer = null;
            }
        });

        // Focus needed to capture some key events.
        viewerDiv.focus();
    }


    /**
     * Add layer in viewer.
     * The layer id must be unique.
     *
     * The `layer.whenReady` is a promise that resolves when
     * the layer is done. This promise is also returned by
     * `addLayer` allowing to chain call.
     *
     * @param {LayerOptions|Layer|GeometryLayer} layer
     * @param {Layer=} parentLayer
     * @return {Promise} a promise resolved with the new layer object when it is fully initialized or rejected if any error occurred.
     */
    addLayer(layer, parentLayer) {
        return new Promise((resolve, reject) => {
            if (!layer) {
                reject(new Error('layer is undefined'));
                return;
            }
            const duplicate = this.getLayerById(layer.id);
            if (duplicate) {
                reject(new Error(`Invalid id '${layer.id}': id already used`));
                return;
            }

            layer = _preprocessLayer(this, layer, parentLayer);

            if (parentLayer) {
                if (layer.isColorLayer) {
                    const layerColors = this.getLayers(l => l.isColorLayer);

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
                    !this._frameRequesters[MAIN_LOOP_EVENTS.UPDATE_END].includes(this._allLayersAreReadyCallback)) {
                    this.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, this._allLayersAreReadyCallback);
                }
                resolve(layer);
            });

            this.dispatchEvent({
                type: VIEW_EVENTS.LAYER_ADDED,
                layerId: layer.id,
            });
        });
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
            if ((changeSource.isTileMesh || changeSource.isCamera) && this._fullSizeDepthBuffer) {
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
            for (const attached of layer.attachedLayers) {
                if (!filter || filter(attached, layer)) {
                    result.push(attached);
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
        const layers = this.getLayers(l => l.id === layerId);
        if (layers.length) {
            return layers[0];
        }
    }


    /**
     * @param {Layer} layer
     * @returns {GeometryLayer} the parent layer of the given layer or undefined.
     */
    getParentLayer(layer) {
        for (const geometryLayer of this._layers) {
            for (const attached of geometryLayer.attachedLayers) {
                if (attached === layer) {
                    return geometryLayer;
                }
            }
        }
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
        if (event.touches === undefined || !event.touches.length) {
            return target.set(event.clientX, event.clientY);
        } else {
            const br = this.mainLoop.gfxEngine.renderer.domElement.getBoundingClientRect();
            return target.set(
                event.touches[touchIdx].clientX - br.x,
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
     * @return {THREE.Vector2} - NDC coordinates (x and y are [-1, 1])
     */
    viewToNormalizedCoords(viewCoords) {
        _eventCoords.x = 2 * (viewCoords.x / this.camera.width) - 1;
        _eventCoords.y = -2 * (viewCoords.y / this.camera.height) + 1;
        return _eventCoords;
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
    pickObjectsAt(mouseOrEvt, radius = 0, ...where) {
        const results = [];
        const sources = where.length == 0 ?
            this.getLayers(l => l.isGeometryLayer) :
            [...where];
        const mouse = (mouseOrEvt instanceof Event) ? this.eventToViewCoords(mouseOrEvt) : mouseOrEvt;

        for (const source of sources) {
            if (source.isLayer ||
                typeof (source) === 'string') {
                const layer = (typeof (source) === 'string') ?
                    this.getLayerById(source) :
                    source;
                if (!layer || !layer.ready) {
                    console.warn('view.pickObjectAt : layer is not ready : ', source);
                    continue;
                }

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
            } else if (source.isObject3D) {
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
        const fov = THREE.Math.degToRad(this.camera.camera3D.fov);
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
        return this.getPixelsToMetersFromDistance(pixels, this.getDistanceFromCamera(screenCoord));
    }

    getPixelsToMetersFromDistance(pixels = 1, distance = 1) {
        return pixels * distance / this.camera._preSSE;
    }

    /**
     * Get, for a specific screen coordinate, this size in pixels of a projected
     * distance on the surface of the main layer of the view.
     *
     * @param {number} [meters=1] - The size, in meters, to get in pixels.
     * @param {THREE.Vector2} [screenCoord] - The screen coordinate to get the
     * projected distance at. By default, this is the middle of the screen.
     *
     * @return {number} The projected distance in meters.
     */
    getMetersToPixels(meters = 1, screenCoord) {
        return this.getMetersToPixelsFromDistance(meters, this.getDistanceFromCamera(screenCoord));
    }

    getMetersToPixelsFromDistance(meters = 1, distance = 1) {
        return this.camera._preSSE * meters / distance;
    }

    /**
     * Returns features under the mouse, for a set of specified layers.
     *
     * @param {MouseEvent|Object} mouseOrEvt - A MouseEvent, or a screen
     * coordinates.
     * @param {number} [radius=3] - The precision of the picking, in pixels.
     * @param {Layer[]} [where] - The layers to look into. If not specified, all
     * `GeometryLayer` and `ColorLayer` layers of this view will be looked in.
     *
     * @return {Object} - An object, with a property per layer. For example,
     * looking for features on layers `wfsBuilding` and `wfsRoads` will give an
     * object like `{ wfsBuilding: [...], wfsRoads: [] }`. Each property is made
     * of an array, that can be empty or filled with found features.
     *
     * @example
     * view.pickFeaturesAt({ x, y });
     * view.pickFeaturesAt({ x, y }, 1, ['wfsBuilding']);
     * view.pickFeaturesAt({ x, y }, 3, ['wfsBuilding', myLayer]);
     */
    pickFeaturesAt(mouseOrEvt, radius = 3, where = []) {
        const result = {};
        let layers = where.length == 0 ? this.getLayers(l => (l.isGeometryLayer || l.isColorLayer)) : where;
        layers = layers.map((l) => {
            const id = l.isLayer ? l.id : l;
            result[id] = [];
            return id;
        });

        // Get the mouse coordinates to the correct system
        const mouse = (mouseOrEvt instanceof Event) ? this.eventToViewCoords(mouseOrEvt, _eventCoords) : mouseOrEvt;

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
                    if (!texture.parsedData) {
                        continue;
                    }

                    precision = CRS.isMetricUnit(texture.parsedData.crs) ? precisions.M : precisions.D;

                    result[materialLayer.id] = result[materialLayer.id].concat(
                        FeaturesUtils.filterFeaturesUnderCoordinate(coordinates, texture.parsedData, precision));
                }
            }
        }

        return result;
    }

    readDepthBuffer(x, y, width, height) {
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

        if (target.length() > 10000000) { return undefined; }

        return target;
    }
}

export default View;
