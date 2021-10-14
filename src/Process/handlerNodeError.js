// max retry loading before changing the status to definitiveError
const MAX_RETRY = 4;

export default function handlingError(err, node, layer, targetLevel, view) {
    if (err.isCancelledCommandException) {
        node.layerUpdateState[layer.id].success();
    } else if (err instanceof SyntaxError) {
        node.layerUpdateState[layer.id].failure(0, true);
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
        const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
        node.layerUpdateState[layer.id].failure(Date.now(), definitiveError, { targetLevel });
        if (!definitiveError) {
            window.setTimeout(() => {
                view.notifyChange(node, false);
            }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
        }
    }
}
