import ScreenSpaceError from '../Core/ScreenSpaceError';
import { SIZE_TEXTURE_TILE } from '../Core/Scheduler/Providers/OGCWebServiceHelper';

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
            node.geometricError,
            ScreenSpaceError.MODE_2D);
        node.sse.sse = Math.max(0, node.sse.sse - SIZE_TEXTURE_TILE);
        node.sse.offset = SIZE_TEXTURE_TILE;
        return node.sse.sse > layer.sseThreshold;
    };
}
