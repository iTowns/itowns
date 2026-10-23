// max retry loading before changing the status to definitiveError
const MAX_RETRY = 4;

export default function handlingError(err, node, layer, targetLevel, view, layerState) {
    const state = node.layerUpdateState[layer.id] || layerState;
    // Cancel error handling if the layer was removed between command scheduling and its execution
    if (!state) {
        return;
    }

    if (err.isCancelledCommandException) {
        state.success();
    } else if (err instanceof SyntaxError) {
        state.failure(0, true);
    } else {
        if (__DEBUG__) {
            if (layer.isColorLayer) {
                console.warn('Error in process color on layer', layer.id, ', node', node, err);
            } else if (layer.isElevationLayer) {
                console.warn('Error in process elevation on layer', layer.id, ', node', node, err);
            } else {
                console.warn('Error in process feature on layer', layer.id, ', node', node, err);
            }
        }
        const definitiveError = state.errorCount > MAX_RETRY;
        state.failure(Date.now(), definitiveError, { targetLevel });
        if (!definitiveError) {
            window.setTimeout(() => {
                view.notifyChange(node, false);
            }, state.secondsUntilNextTry() * 1000);
        }
    }
}
