import { EMPTY_TEXTURE_ZOOM } from '../../Renderer/LayeredMaterialConstants';
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
function _group(nodeLevel, currentLevel, options) {
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
function _dichotomy(nodeLevel, currentLevel, options) {
    if (currentLevel == EMPTY_TEXTURE_ZOOM) {
        return options.zoom.min;
    }
    return Math.min(
        nodeLevel,
        Math.ceil((currentLevel + nodeLevel) / 2));
}

export function chooseNextLevelToFetch(strategy, node, nodeLevel, currentLevel, layer) {
    switch (strategy) {
        case STRATEGY_GROUP:
            return _group(nodeLevel, currentLevel, layer.updateStrategy.options);
        case STRATEGY_PROGRESSIVE:
            return _progressive(nodeLevel, currentLevel, layer.updateStrategy.options);
        case STRATEGY_DICHOTOMY:
            return _dichotomy(nodeLevel, currentLevel, layer.options);
        // default strategy
        case STRATEGY_MIN_NETWORK_TRAFFIC:
        default:
            return _minimizeNetworkTraffic(node, nodeLevel, currentLevel);
    }
}
