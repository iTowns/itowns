import { EMPTY_TEXTURE_ZOOM } from 'Renderer/MaterialLayer';
/**
 * This modules implements various layer update strategies.
 *
 * Default strategy is STRATEGY_MIN_NETWORK_TRAFFIC which aims
 * to reduce the amount of network traffic.
 */

export const STRATEGY_MIN_NETWORK_TRAFFIC = 0;
export const STRATEGY_GROUP = 1;
export const STRATEGY_PROGRESSIVE = 2;
export const STRATEGY_DICHOTOMY = 3;

function _minimizeNetworkTraffic(node, nodeLevel, currentLevel) {
    if (node.pendingSubdivision) {
        return currentLevel;
    }
    return nodeLevel;
}

// Maps nodeLevel to groups defined in layer's options
// eg with groups = [3, 7, 12]:
//     * nodeLevel = 2 -> 3
//     * nodeLevel = 4 -> 3
//     * nodeLevel = 7 -> 7
//     * nodeLevel = 15 -> 12
function _group(nodeLevel, options) {
    var f = options.groups.filter(val => (val <= nodeLevel));
    return f.length ? f[f.length - 1] : options.groups[0];
}

function _progressive(nodeLevel, currentLevel, options) {
    return Math.min(nodeLevel,
        currentLevel + (options.increment || 1));
}

// Load textures at mid-point between current level and node's level.
// This produces smoother transitions and a single fetch updates multiple
// tiles thanks to caching.
function _dichotomy(nodeLevel, currentLevel, options = {}) {
    if (currentLevel == EMPTY_TEXTURE_ZOOM) {
        return options.zoom ? options.zoom.min : 0;
    }
    return Math.min(
        nodeLevel,
        Math.ceil((currentLevel + nodeLevel) / 2));
}

export function chooseNextLevelToFetch(strategy, node, nodeLevel = node.level, currentLevel, layer, failureParams) {
    let nextLevelToFetch;
    const maxZoom = layer.source.zoom ? layer.source.zoom.max : Infinity;
    if (failureParams.lowestLevelError != Infinity) {
        nextLevelToFetch = _dichotomy(failureParams.lowestLevelError, currentLevel, layer.source);

        nextLevelToFetch = failureParams.lowestLevelError == nextLevelToFetch ? nextLevelToFetch - 1 : nextLevelToFetch;

        if (strategy == STRATEGY_GROUP) {
            nextLevelToFetch = _group(nextLevelToFetch, layer.updateStrategy.options);
        }
    } else {
        switch (strategy) {
            case STRATEGY_GROUP:
                nextLevelToFetch = _group(nodeLevel, layer.updateStrategy.options);
                break;
            case STRATEGY_PROGRESSIVE: {
                nextLevelToFetch = _progressive(nodeLevel, currentLevel, layer.updateStrategy.options);
                break;
            }
            case STRATEGY_DICHOTOMY:
                nextLevelToFetch = _dichotomy(nodeLevel, currentLevel, layer.source);
                break;
            // default strategy
            case STRATEGY_MIN_NETWORK_TRAFFIC:
            default:
                nextLevelToFetch = _minimizeNetworkTraffic(node, nodeLevel, currentLevel);
        }
        nextLevelToFetch = Math.min(nextLevelToFetch, maxZoom);
    }
    return nextLevelToFetch;
}
