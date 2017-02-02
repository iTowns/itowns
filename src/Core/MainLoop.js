const RENDERING_PAUSED = 0;
const RENDERING_ACTIVE = 1;

function MainLoop(scheduler, engine) {
    this.renderingState = RENDERING_PAUSED;
    this.scheduler = scheduler;
    this.gfxEngine = engine; // TODO: remove me

    this.needsRedraw = false;
    this.lastRenderTime = 0;
    this.maxFramePerSec = 60;

    this._viewsToUpdate = new Set();
}

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

function updateElements(context, geometryLayer, elements) {
    if (!elements) {
        return;
    }
    for (const element of elements) {
        // update element
        const newElementsToUpdate = geometryLayer.update(context, geometryLayer, element);

        // update attached layers
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
        const elementsToUpdate = geometryLayer.preUpdate(context, geometryLayer);
        updateElements(context, geometryLayer, elementsToUpdate);
    }
};

MainLoop.prototype._step = function _step(view) {
    // update data-structure
    const executedDuringUpdate = this.scheduler.resetCommandsCount('executed');
    this._update(view);

    // Check if we're done (no command left).
    // We need to make sure we didn't executed any commands because these commands
    // might spawn other commands in a next update turn.
    if (this.scheduler.commandsWaitingExecutionCount() == 0 && executedDuringUpdate == 0) {
        // TODO per view
        // this.viewerDiv.dispatchEvent(new CustomEvent('globe-built'));

        // one last rendering before pausing
        this._renderView(view);

        // reset rendering flag
        this.renderingState = RENDERING_PAUSED;

        if (__DEBUG__) {
            document.title = document.title.substr(0, document.title.length - 2);
        }
    } else {
        const ts = Date.now();

        // update rendering
        if ((1000.0 / this.maxFramePerSec) < (ts - this.lastRenderTime)) {
            // only perform rendering if needed
            if (this.needsRedraw) {
                this._renderView(view);
                this.lastRenderTime = ts;
            }
        }

        requestAnimationFrame(() => { this._step(view); });
    }
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
    this.gfxEngine.renderScene(view.camera);
    this.needsRedraw = false;

    // Mimic three Object3D.onAfterRender (which sadly doesn't work on Scene)
    view.onAfterRender();
};

export default MainLoop;
