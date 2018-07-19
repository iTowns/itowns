function frustumCullingOBB(node, camera) {
    return camera.isBox3Visible(node.OBB().box3D, node.OBB().matrixWorld);
}

export function planarCulling(node, camera) {
    return !frustumCullingOBB(node, camera);
}

function _isTileBigOnScreen(camera, node) {
    const onScreen = camera.box3SizeOnScreen(node.OBB().box3D, node.matrixWorld);

    // onScreen.x/y/z are [-1, 1] so divide by 2
    // (so x = 0.4 means the object width on screen is 40% of the total screen width)
    const dim = {
        x: 0.5 * (onScreen.max.x - onScreen.min.x) * camera.width,
        y: 0.5 * (onScreen.max.y - onScreen.min.y) * camera.height,
    };

    // subdivide if on-screen width (and resp. height) is bigger than 30% of the screen width (resp. height)
    // TODO: the 30% value is arbitrary and needs to be configurable by the user
    // TODO: we might want to use texture resolution here as well
    return (dim.x >= 256 && dim.y >= 256);
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
        const textureInfos = node.material.getLayerTextures({ type: 'elevation' });
        if (textureInfos.textures[0].extent) {
            const offsetScale = textureInfos.offsetScales[0];
            const ratio = offsetScale.z;
            // ratio is node size / texture size
            if (ratio < 1 / Math.pow(2, maxDeltaElevationLevel)) {
                return false;
            }
        }

        return _isTileBigOnScreen(context.camera, node);
    };
}
