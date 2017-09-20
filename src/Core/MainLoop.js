import { EventDispatcher } from 'three';

export const RENDERING_PAUSED = 0;
export const RENDERING_SCHEDULED = 1;

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
            attachedLayer.update(context, attachedLayer, element);
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

    // notify the frameRequesters
    // Frame requesters should keep calling view.notifyChange in their update
    // function if they want requestAnimationFrame to go on.
    if (view._frameRequesters.length > 0) {
        for (const frameRequester of view._frameRequesters) {
            if (frameRequester.update) {
                frameRequester.update(dt, this._updateLoopRestarted);
            }
        }
    }

    for (const geometryLayer of view.getLayers((x, y) => !y)) {
        context.geometryLayer = geometryLayer;
        if (geometryLayer.ready) {
            // `preUpdate` returns an array of elements to update
            const elementsToUpdate = geometryLayer.preUpdate(context, geometryLayer, updateSources);
            // `update` is called in `updateElements`.
            updateElements(context, geometryLayer, elementsToUpdate);
            // `postUpdate` is called when this geom layer update process is finished
            geometryLayer.postUpdate(context, geometryLayer, updateSources);
        }
    }
};

MainLoop.prototype._step = function _step(view, timestamp) {
    const willRedraw = this.needsRedraw;
    const dt = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    // Reset internal state before calling _update (so future calls to View.notifyChange()
    // can properly change it)
    this.needsRedraw = false;
    this.renderingState = RENDERING_PAUSED;
    const updateSources = new Set(view._changeSources);
    view._changeSources.clear();

    // update camera
    const dim = this.gfxEngine.getWindowSize();

    view.camera.update(dim.x, dim.y);

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
        this._renderView(view);
    }

    // next time, we'll consider that we've just started the loop if we are still PAUSED now
    this._updateLoopRestarted = this.renderingState === RENDERING_PAUSED;

    if (__DEBUG__) {
        document.title = document.title.substr(0, document.title.length - 2);
    }

    view.camera.camera3D.matrixAutoUpdate = oldAutoUpdate;
};

MainLoop.prototype._renderView = function _renderView(view) {
    if (view.preRender) {
        view.preRender();
    }

    if (view.render) {
        view.render();
    } else {
        // use default rendering method
        this.gfxEngine.renderView(view);
    }

    // Mimic three Object3D.onAfterRender (which sadly doesn't work on Scene)
    view.onAfterRender();
};

export default MainLoop;
