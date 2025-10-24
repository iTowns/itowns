// max retry loading before changing the status to definitiveError
const MAX_RETRY = 4;

export default function handlingError(err, node, targetLevel) {
    // Cancel error handling if the node.layer was removed between command scheduling and its execution
    if (!node.state) {
        return;
    }

    if (err.isCancelledCommandException) {
        node.state.success();
    } else if (err instanceof SyntaxError) {
        node.state.failure(0, true);
    } else {
        if (__DEBUG__) {
            if (node.layer.isColorLayer) {
                console.warn('Error in process color on node.layer', node.layer.id, err);
            } else if (node.layer.isElevationLayer) {
                console.warn('Error in process elevation on node.layer', node.layer.id, err);
            } else {
                console.warn('Error in process feature on node.layer', node.layer.id, err);
            }
        }
        const definitiveError = node.state.errorCount > MAX_RETRY;
        node.state.failure(Date.now(), definitiveError, { targetLevel });
        if (!definitiveError) {
            window.setTimeout(() => {
                node.dispatchEvent({ type: 'nextTry', node: this });
            }, node.state.secondsUntilNextTry() * 1000);
        }
    }
}
