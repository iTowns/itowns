import { EMPTY_TEXTURE_ZOOM, RasterTile } from 'Renderer/RasterTile';
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

// Is there a need to add the possibility to use custom strategy?
export type LayerUpdateStrategy =
    | StrategyMinNetworkTraffic
    | StrategyGroup
    | StrategyProgressive
    | StrategyDichotomy;

interface StrategyMinNetworkTraffic {
    type: typeof STRATEGY_MIN_NETWORK_TRAFFIC;
}

interface StrategyGroup {
    type: typeof STRATEGY_GROUP;
    options: { groups: number[] };
}

interface StrategyProgressive {
    type: typeof STRATEGY_PROGRESSIVE;
    options: { increment?: number };
}

interface StrategyDichotomy {
    type: typeof STRATEGY_DICHOTOMY;
}

function _minimizeNetworkTraffic(nodeLevel: number) {
    return nodeLevel;
}

// Maps nodeLevel to groups defined in layer's options
// eg with groups = [3, 7, 12]:
//     * nodeLevel = 2 -> 3
//     * nodeLevel = 4 -> 3
//     * nodeLevel = 7 -> 7
//     * nodeLevel = 15 -> 12
function _group(nodeLevel: number, options: StrategyGroup['options']) {
    const f = options.groups.filter(val => (val <= nodeLevel));
    return f.length ? f[f.length - 1] : options.groups[0];
}

function _progressive(
    nodeLevel: number,
    currentLevel: number,
    options: StrategyProgressive['options'],
) {
    return Math.min(nodeLevel, currentLevel + (options.increment || 1));
}

// Load textures at mid-point between current level and node's level.
// This produces smoother transitions and a single fetch updates multiple
// tiles thanks to caching.
function _dichotomy(nodeLevel: number, currentLevel: number, zoom?: { min: number }) {
    if (currentLevel == EMPTY_TEXTURE_ZOOM) {
        return zoom?.min ?? 0;
    }
    return Math.min(
        nodeLevel,
        Math.ceil((currentLevel + nodeLevel) / 2));
}

export function chooseNextLevelToFetch(
    strategy: LayerUpdateStrategy,
    nodeLevel: number,
    currentLevel: number,
    failureParams: { lowestLevelError: number },
    zoom?: { min: number; max: number },
): number {
    let nextLevelToFetch;

    const maxZoom = zoom?.max ?? Infinity;
    if (failureParams.lowestLevelError != Infinity) {
        nextLevelToFetch = _dichotomy(failureParams.lowestLevelError, currentLevel, zoom);

        nextLevelToFetch =
            failureParams.lowestLevelError == nextLevelToFetch ?
                nextLevelToFetch - 1 : nextLevelToFetch;

        if (strategy.type == STRATEGY_GROUP) {
            nextLevelToFetch = _group(nextLevelToFetch, strategy.options);
        }
    } else {
        switch (strategy.type) {
            case STRATEGY_GROUP:
                nextLevelToFetch = _group(nodeLevel, strategy.options);
                break;
            case STRATEGY_PROGRESSIVE: {
                nextLevelToFetch = _progressive(nodeLevel, currentLevel, strategy.options);
                break;
            }
            case STRATEGY_DICHOTOMY:
                nextLevelToFetch = _dichotomy(nodeLevel, currentLevel, zoom);
                break;
            // default strategy
            case STRATEGY_MIN_NETWORK_TRAFFIC:
            default:
                nextLevelToFetch = _minimizeNetworkTraffic(nodeLevel);
        }
        nextLevelToFetch = Math.min(nextLevelToFetch, maxZoom);
    }
    return nextLevelToFetch;
}

export const nextLevelToFetch = (t: RasterTile) => {
    const zoom = {
        min: Math.max(t.layer.zoom.min, t.layer.source.zoom?.min),
        max: Math.min(t.layer.zoom.max, t.layer.source.zoom?.max),
    };
    return chooseNextLevelToFetch(
        t.layer.updateStrategy,
        t.tiles[0].zoom,
        t.level,
        t.state.failureParams,
        zoom,
    );
};
