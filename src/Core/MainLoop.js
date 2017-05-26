// `MainLoop` is the owner of the update cycle.
//
// Its the sole place in iTowns using `requestAnimationFrame()` and it must be
// used when you want to update *something* (layers, controls, etc).
// MainLoop is a bit of a misnamer since it will **pause** as soon as possible,
// to avoid unnecessary CPU/battery usage.
//
// Note that `MainLoop` is rarely used directly and you'll often just need
// to call [View.notifyChange](View.html#notifychange) to execute an update.

import { EventDispatcher } from 'three';

// ### MainLoop
// Constructor.
// Arguments:
// - *scheduler* is a Scheduler* instance
// - *engine* is a c3DEngine* instance

function MainLoop(scheduler, engine) {
    this.renderingState = RENDERING_PAUSED;
    this.needsRedraw = false;
    this.scheduler = scheduler;
    this.gfxEngine = engine; // TODO: remove me
}

MainLoop.prototype = Object.create(EventDispatcher.prototype);
MainLoop.prototype.constructor = MainLoop;

// ### scheduleViewUpdate
// Call this function when you want to update iTowns.
// It will resume MainLoop if it's currently paused, otherwise it's ignored.
// If `forceRedraw` the `view` will be rendered at the end of the update cycle.
MainLoop.prototype.scheduleViewUpdate = function scheduleViewUpdate(view, forceRedraw) {
    this.needsRedraw |= forceRedraw;

    if (this.renderingState !== RENDERING_ACTIVE) {
        this.renderingState = RENDERING_ACTIVE;
        if (__DEBUG__) {
            document.title += ' ⌛';
        }

        requestAnimationFrame(() => { this._step(view); });
    }
};


// #### Private API

function updateElements(context, geometryLayer, elements) {
    if (!elements) {
        return;
    }
    for (const element of elements) {
        /* update element */
        const newElementsToUpdate = geometryLayer.update(context, geometryLayer, element);

        /* update attached layers */
        for (const attachedLayer of geometryLayer._attachedLayers) {
            attachedLayer.update(context, attachedLayer, element);
        }
        updateElements(context, geometryLayer, newElementsToUpdate);
    }
}

MainLoop.prototype._update = function _update(view) {
    const context = {
        camera: view.camera,
        engine: this.gfxEngine,
        scheduler: this.scheduler,
        view,
    };

    for (const geometryLayer of view.getLayers((x, y) => !y)) {
        context.geometryLayer = geometryLayer;
        const elementsToUpdate = geometryLayer.preUpdate(context, geometryLayer, view._changeSources);
        updateElements(context, geometryLayer, elementsToUpdate);
    }
};

MainLoop.prototype._step = function _step(view) {
    /* update data-structure */
    this._update(view);

    if (this.scheduler.commandsWaitingExecutionCount() == 0) {
        this.dispatchEvent({ type: 'command-queue-empty' });
    }

    /* Redraw *only* if needed. */
    /* (redraws only happen when this.needsRedraw is true, which in turn only happens when */
    /* view.notifyChange() is called with redraw=true) */
    /* As such there's no continuous update-loop, instead we use a ad-hoc update/render */
    /* mechanism. */
    if (this.needsRedraw) {
        this._renderView(view);
        this.needsRedraw = false;
    }

    if (__DEBUG__) {
        document.title = document.title.substr(0, document.title.length - 2);
    }
    this.renderingState = RENDERING_PAUSED;
    view._changeSources.clear();
};

/**
 */
MainLoop.prototype._renderView = function _renderView(view) {
    const dim = this.gfxEngine.getWindowSize();
    view.camera.resize(dim.x, dim.y);
    view.camera.update();

    if (view.preRender) {
        view.preRender();
    }

    if (view.render) {
        view.render();
    } else {
        /* use default rendering method */
        this.gfxEngine.renderView(view);
    }
    this.needsRedraw = false;

    /* Mimic three Object3D.onAfterRender (which sadly doesn't work on Scene) */
    view.onAfterRender();
};

// RENDERING_PAUSED means no update is taking place. Nothing will happen until
// `scheduleViewUpdate` is called
const RENDERING_PAUSED = 0;
// RENDERING_ACTIVE means there's an update pending or in-progress. Calls to
// `scheduleViewUpdate` do not execute a new `requestAnimationFrame`.
const RENDERING_ACTIVE = 1;


export default MainLoop;
