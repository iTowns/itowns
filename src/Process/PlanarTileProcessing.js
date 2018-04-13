import ScreenSpaceError from '../Core/ScreenSpaceError';
import { SIZE_TEXTURE_TILE } from '../Provider/OGCWebServiceHelper';

function frustumCullingOBB(node, camera) {
    return camera.isBox3Visible(node.OBB().box3D, node.OBB().matrixWorld);
}

export function planarCulling(node, camera) {
    return !frustumCullingOBB(node, camera);
}

export function prePlanarUpdate(context, layer) {
    const elevationLayers = context.view.getLayers((l, a) => a && a.id == layer.id && l.type == 'elevation');
    context.maxElevationLevel = -1;
    for (const e of elevationLayers) {
        context.maxElevationLevel = Math.max(e.options.zoom.max, context.maxElevationLevel);
    }
    if (context.maxElevationLevel == -1) {
        context.maxElevationLevel = Infinity;
    }
}

export function planarSubdivisionControl(maxLevel, maxDeltaElevationLevel) {
    return function _planarSubdivisionControl(context, layer, node) {
        if (maxLevel <= node.level) {
            return false;
        }

        // Prevent to subdivise the node if the current elevation level
        // we must avoid a tile, with level 20, inherits a level 3 elevation texture.
        // The induced geometric error is much too large and distorts the SSE
        const currentElevationLevel = node.material.getElevationLayerLevel();
        if (node.level < context.maxElevationLevel + maxDeltaElevationLevel &&
            currentElevationLevel >= 0 &&
            (node.level - currentElevationLevel) >= maxDeltaElevationLevel) {
            return false;
        }
        node.sse = ScreenSpaceError.computeFromBox3(
            context.camera,
            node.OBB().box3D,
            node.OBB().matrixWorld,
            node.geometricError);
        node.sse.offset = SIZE_TEXTURE_TILE;

        const cond1x = (node.sse.sse[0] > (SIZE_TEXTURE_TILE + layer.sseThreshold));
        const cond1y = (node.sse.sse[1] > (SIZE_TEXTURE_TILE + layer.sseThreshold));
        const cond2x = (node.sse.sse[0] > (SIZE_TEXTURE_TILE + layer.sseThreshold) * 0.85);
        const cond2y = (node.sse.sse[1] > (SIZE_TEXTURE_TILE + layer.sseThreshold) * 0.85);

        if (cond1x && cond1y) {
            return true;
        }
        if (cond1x) {
            return cond2y;
        }
        if (cond1y) {
            return cond2x;
        }
        return false;
    };
}
