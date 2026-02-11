import { GeometryLayer, Layer, View } from 'Main';
import { EventDispatcher, Object3D, Camera as ThreeCamera } from 'three';
import Camera from 'Renderer/Camera';
import c3DEngine from 'Renderer/c3DEngine';
import Scheduler from './Scheduler/Scheduler';

export const RENDERING_PAUSED = 0;
export const RENDERING_SCHEDULED = 1;

/**
 * MainLoop's update events list that are fired using
 * {@link View#execFrameRequesters}.
 */
export const MAIN_LOOP_EVENTS = {
    /** Fired at the start of the update */
    UPDATE_START: 'update_start',
    /** Fired before the camera update */
    BEFORE_CAMERA_UPDATE: 'before_camera_update',
    /** Fired after the camera update */
    AFTER_CAMERA_UPDATE: 'after_camera_update',
    /** Fired before the layer update */
    BEFORE_LAYER_UPDATE: 'before_layer_update',
    /** Fired after the layer update */
    AFTER_LAYER_UPDATE: 'after_layer_update',
    /** Fired before the render */
    BEFORE_RENDER: 'before_render',
    /** Fired after the render */
    AFTER_RENDER: 'after_render',
    /** Fired at the end of the update */
    UPDATE_END: 'update_end',
};

type Context = {
    camera: Camera,
    engine: c3DEngine,
    scheduler: Scheduler,
    view: View,
};

type UpdatableGeometryLayer<T> = GeometryLayer & {
    update(context: Context, layer: Layer, node: T): Array<T> | undefined
};

function updateElements<T extends Object3D>(
    context: Context,
    geometryLayer: UpdatableGeometryLayer<T>,
    elements?: Array<T>,
) {
    if (!elements) {
        return;
    }
    for (const element of elements) {
        // update element
        // TODO: find a way to notify attachedLayers when geometryLayer deletes
        // some elements and then update Debug.js:addGeometryLayerDebugFeatures
        const newElementsToUpdate = geometryLayer.update(context, geometryLayer, element);

        const sub = geometryLayer.getObjectToUpdateForAttachedLayers(element);

        if (sub) {
            for (let i = 0; i < sub.elements.length; i++) {
                if (!(sub.elements[i].isObject3D)) {
                    throw new Error(`
                            Invalid object for attached layer to update.
                            Must be a THREE.Object and have a THREE.Material`);
                }
                // update attached layers
                for (const attachedLayer of geometryLayer.attachedLayers) {
                    if (attachedLayer.ready) {
                        // @ts-expect-error Updatable layer
                        attachedLayer.update(context,
                            attachedLayer,
                            sub.elements[i],
                            sub.parent);
                    }
                }
            }
        }

        updateElements(context, geometryLayer, newElementsToUpdate);
    }
}

// TODO: Figure out what that last type actually is
type UpdateSource = Layer | ThreeCamera | { layer: Layer };

function filterChangeSources(
    updateSources: Set<UpdateSource>,
    geometryLayer: GeometryLayer,
): Set<UpdateSource> {
    let fullUpdate = false;
    const filtered = new Set<UpdateSource>();
    updateSources.forEach((src) => {
        if (src === geometryLayer || (src as ThreeCamera).isCamera) {
            geometryLayer.info.clear();
            fullUpdate = true;
        } else if ((src as { layer: Layer }).layer === geometryLayer) {
            filtered.add(src);
        }
    });
    return fullUpdate ? new Set([geometryLayer]) : filtered;
}

type MainLoopEvents = {
    // An unknown body indicates an empty event
    'command-queue-empty': unknown;
};

class MainLoop extends EventDispatcher<MainLoopEvents> {
    #needsRedraw = false;
    #updateLoopRestarted = true;
    #lastTimestamp = 0;

    public renderingState: typeof RENDERING_PAUSED | typeof RENDERING_SCHEDULED;
    public scheduler: Scheduler;
    public gfxEngine: c3DEngine;

    constructor(scheduler: Scheduler, engine: c3DEngine) {
        super();
        this.renderingState = RENDERING_PAUSED;
        this.scheduler = scheduler;
        this.gfxEngine = engine; // TODO: remove me
    }

    public scheduleViewUpdate(view: View, forceRedraw: boolean) {
        this.#needsRedraw ||= forceRedraw;

        if (this.renderingState !== RENDERING_SCHEDULED) {
            this.renderingState = RENDERING_SCHEDULED;

            if (__DEBUG__) {
                document.title += ' ⌛';
            }

            // TODO Fix asynchronization between xr and MainLoop render loops.
            // WebGLRenderer#setAnimationLoop must be used for WebXR projects.
            // (see WebXR#initializeWebXR).
            if (!this.gfxEngine.renderer.xr.isPresenting) {
                requestAnimationFrame((timestamp) => { this.step(view, timestamp); });
            }
        }
    }

    #update(view: View, updateSources: Set<UpdateSource>, dt: number) {
        const context: Context = {
            camera: view.camera,
            engine: this.gfxEngine,
            scheduler: this.scheduler,
            view,
        };

        // replace layer with their parent where needed
        updateSources.forEach((src: UpdateSource) => {
            // @ts-expect-error True JS shenanigans
            const layer = src.layer || src;
            if (layer.isLayer && layer.parent) {
                updateSources.add(layer.parent);
            }
        });

        for (const geometryLayer of view.getLayers((_, y) => !y)) {
            if (geometryLayer.ready && geometryLayer.visible && !geometryLayer.frozen) {
                view.execFrameRequesters(
                    MAIN_LOOP_EVENTS.BEFORE_LAYER_UPDATE, dt, this.#updateLoopRestarted,
                    geometryLayer,
                );

                // Filter updateSources that are relevant for the geometryLayer
                const srcs = filterChangeSources(updateSources, geometryLayer);
                if (srcs.size > 0) {
                    // pre update attached layer
                    for (const attachedLayer of geometryLayer.attachedLayers) {
                        if (attachedLayer.ready && attachedLayer.preUpdate) {
                            attachedLayer.preUpdate(context, srcs);
                        }
                    }
                    // `preUpdate` returns an array of elements to update
                    const elementsToUpdate = geometryLayer.preUpdate(context, srcs);
                    // `update` is called in `updateElements`.
                    updateElements(context, geometryLayer, elementsToUpdate);
                    // `postUpdate` is called when this geom layer update
                    // process is finished
                    geometryLayer.postUpdate(context, geometryLayer, updateSources);
                }

                // Clear the cache of expired resources

                view.execFrameRequesters(MAIN_LOOP_EVENTS.AFTER_LAYER_UPDATE,
                    dt, this.#updateLoopRestarted, geometryLayer);
            }
        }
    }

    step(view: View, timestamp: number) {
        const dt = timestamp - this.#lastTimestamp;
        view._executeFrameRequestersRemovals();

        view.execFrameRequesters(MAIN_LOOP_EVENTS.UPDATE_START, dt, this.#updateLoopRestarted);

        const willRedraw = this.#needsRedraw;
        this.#lastTimestamp = timestamp;

        // Reset internal state before calling _update (so future calls to
        // View.notifyChange() can properly change it)
        this.#needsRedraw = false;
        this.renderingState = RENDERING_PAUSED;
        const updateSources = new Set(view._changeSources);
        view._changeSources.clear();

        view.execFrameRequesters(MAIN_LOOP_EVENTS.BEFORE_CAMERA_UPDATE,
            dt, this.#updateLoopRestarted);
        view.camera.update();
        view.execFrameRequesters(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE,
            dt, this.#updateLoopRestarted);

        // Disable camera's matrix auto update to make sure the camera's
        // world matrix is never updated mid-update.
        // Otherwise inconsistencies can appear because object visibility
        // testing and object drawing could be performed using different
        // camera matrixWorld.
        // Note: this is required at least because WEBGLRenderer calls
        // camera.updateMatrixWorld()
        const oldAutoUpdate = view.camera3D.matrixAutoUpdate;
        view.camera3D.matrixAutoUpdate = false;

        // update data-structure
        this.#update(view, updateSources, dt);

        if (this.scheduler.commandsWaitingExecutionCount() == 0) {
            this.dispatchEvent({ type: 'command-queue-empty' });
        }

        // Redraw *only* if needed.
        // (redraws only happen when this.#needsRedraw is true, which in turn
        // only happens when view.notifyChange() is called with redraw=true)
        // As such there's no continuous update-loop, instead we use an ad-hoc
        // update/render mechanism.
        if (willRedraw) {
            this.#renderView(view, dt);
        }

        // next time, we'll consider that we've just started the loop if we are
        // still PAUSED now
        this.#updateLoopRestarted = this.renderingState === RENDERING_PAUSED;

        if (__DEBUG__) {
            document.title = document.title.substring(0, document.title.length - 2);
        }

        view.camera3D.matrixAutoUpdate = oldAutoUpdate;

        view.execFrameRequesters(MAIN_LOOP_EVENTS.UPDATE_END, dt, this.#updateLoopRestarted);
    }

    #renderView(view: View, dt: number) {
        view.execFrameRequesters(MAIN_LOOP_EVENTS.BEFORE_RENDER, dt, this.#updateLoopRestarted);

        // @ts-expect-error Checking dynamically-added method
        if (view.render) {
            // @ts-expect-error Result of the above
            view.render();
        } else {
            // use default rendering method
            this.gfxEngine.renderView(view);
        }

        view.execFrameRequesters(MAIN_LOOP_EVENTS.AFTER_RENDER, dt, this.#updateLoopRestarted);
    }
}

export default MainLoop;
