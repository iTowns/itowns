import { EventDispatcher } from 'three';

export const RENDERING_PAUSED = 0;
export const RENDERING_SCHEDULED = 1;

/**
 * MainLoop's update events list that are fired using
 * {@link View#execFrameRequesters}.
 *
 * @property UPDATE_START {string} fired at the start of the update
 * @property BEFORE_CAMERA_UPDATE {string} fired before the camera update
 * @property AFTER_CAMERA_UPDATE {string} fired after the camera update
 * @property BEFORE_LAYER_UPDATE {string} fired before the layer update
 * @property AFTER_LAYER_UPDATE {string} fired after the layer update
 * @property BEFORE_RENDER {string} fired before the render
 * @property AFTER_RENDER {string} fired after the render
 * @property UPDATE_END {string} fired at the end of the update
 */

export const MAIN_LOOP_EVENTS = {
    UPDATE_START: 'update_start',
    BEFORE_CAMERA_UPDATE: 'before_camera_update',
    AFTER_CAMERA_UPDATE: 'after_camera_update',
    BEFORE_LAYER_UPDATE: 'before_camera_update',
    AFTER_LAYER_UPDATE: 'after_layer_update',
    BEFORE_RENDER: 'before_render',
    AFTER_RENDER: 'after_render',
    UPDATE_END: 'update_end',
};

function MainLoop(scheduler, engine) {
    this.renderingState = RENDERING_PAUSED;
    this.needsRedraw = false;
    this.scheduler = scheduler;
    this.gfxEngine = engine; // TODO: remove me
    this._updateLoopRestarted = true;
}

MainLoop.prototype = Object.create(EventDispatcher.prototype);
MainLoop.prototype.constructor = MainLoop;

MainLoop.prototype.scheduleViewUpdate = function scheduleViewUpdate(view, forceRedraw) {
    this.needsRedraw |= forceRedraw;

    if (this.renderingState !== RENDERING_SCHEDULED) {
        this.renderingState = RENDERING_SCHEDULED;

        if (__DEBUG__) {
            document.title += ' ⌛';
        }

        requestAnimationFrame((timestamp) => { this._step(view, timestamp); });
    }
};

function updateElements(context, geometryLayer, elements) {
    if (!elements) {
        return;
    }
    for (const element of elements) {
        // update element
        // TODO find a way to notify attachedLayers when geometryLayer deletes some elements
        // and then update Debug.js:addGeometryLayerDebugFeatures
        const newElementsToUpdate = geometryLayer.update(context, geometryLayer, element);

        // update attached layers
        for (const attachedLayer of geometryLayer._attachedLayers) {
            if (attachedLayer.ready) {
                attachedLayer.update(context, attachedLayer, element);
            }
        }
        updateElements(context, geometryLayer, newElementsToUpdate);
    }
}

MainLoop.prototype._update = function _update(view, updateSources, dt) {
    const context = {
        camera: view.camera,
        engine: this.gfxEngine,
        scheduler: this.scheduler,
        view,
    };

    for (const geometryLayer of view.getLayers((x, y) => !y)) {
        context.geometryLayer = geometryLayer;
        if (geometryLayer.ready && geometryLayer.visible) {
            view.execFrameRequesters(MAIN_LOOP_EVENTS.BEFORE_LAYER_UPDATE, dt, this._updateLoopRestarted, geometryLayer);

            // `preUpdate` returns an array of elements to update
            const elementsToUpdate = geometryLayer.preUpdate(context, geometryLayer, updateSources);
            // `update` is called in `updateElements`.
            updateElements(context, geometryLayer, elementsToUpdate);
            // `postUpdate` is called when this geom layer update process is finished
            geometryLayer.postUpdate(context, geometryLayer, updateSources);

            view.execFrameRequesters(MAIN_LOOP_EVENTS.AFTER_LAYER_UPDATE, dt, this._updateLoopRestarted, geometryLayer);
        }
    }
};

MainLoop.prototype._step = function _step(view, timestamp) {
    const dt = timestamp - this._lastTimestamp;
    view.execFrameRequesters(MAIN_LOOP_EVENTS.UPDATE_START, dt, this._updateLoopRestarted);

    const willRedraw = this.needsRedraw;
    this._lastTimestamp = timestamp;

    // Reset internal state before calling _update (so future calls to View.notifyChange()
    // can properly change it)
    this.needsRedraw = false;
    this.renderingState = RENDERING_PAUSED;
    const updateSources = new Set(view._changeSources);
    view._changeSources.clear();

    // update camera
    const dim = this.gfxEngine.getWindowSize();

    view.execFrameRequesters(MAIN_LOOP_EVENTS.BEFORE_CAMERA_UPDATE, dt, this._updateLoopRestarted);
    view.camera.update(dim.x, dim.y);
    view.execFrameRequesters(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, dt, this._updateLoopRestarted);

    // Disable camera's matrix auto update to make sure the camera's
    // world matrix is never updated mid-update.
    // Otherwise inconsistencies can appear because object visibility
    // testing and object drawing could be performed using different
    // camera matrixWorld.
    // Note: this is required at least because WEBGLRenderer calls
    // camera.updateMatrixWorld()
    const oldAutoUpdate = view.camera.camera3D.matrixAutoUpdate;
    view.camera.camera3D.matrixAutoUpdate = false;

    // update data-structure
    this._update(view, updateSources, dt);

    if (this.scheduler.commandsWaitingExecutionCount() == 0) {
        this.dispatchEvent({ type: 'command-queue-empty' });
    }

    // Redraw *only* if needed.
    // (redraws only happen when this.needsRedraw is true, which in turn only happens when
    // view.notifyChange() is called with redraw=true)
    // As such there's no continuous update-loop, instead we use a ad-hoc update/render
    // mechanism.
    if (willRedraw) {
        this._renderView(view, dt);
    }

    // next time, we'll consider that we've just started the loop if we are still PAUSED now
    this._updateLoopRestarted = this.renderingState === RENDERING_PAUSED;

    if (__DEBUG__) {
        document.title = document.title.substr(0, document.title.length - 2);
    }

    view.camera.camera3D.matrixAutoUpdate = oldAutoUpdate;

    view.execFrameRequesters(MAIN_LOOP_EVENTS.UPDATE_END, dt, this._updateLoopRestarted);
};

MainLoop.prototype._renderView = function _renderView(view, dt) {
    view.execFrameRequesters(MAIN_LOOP_EVENTS.BEFORE_RENDER, dt, this._updateLoopRestarted);

    if (view.render) {
        view.render();
    } else {
        // use default rendering method
        this.gfxEngine.renderView(view);
    }

    view.execFrameRequesters(MAIN_LOOP_EVENTS.AFTER_RENDER, dt, this._updateLoopRestarted);
};

export default MainLoop;
