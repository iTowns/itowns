function frustumCullingOBB(node, camera) {
    return camera.isBox3Visible(node.OBB().box3D, node.OBB().matrixWorld);
}

export function planarCulling(node, camera) {
    return !frustumCullingOBB(node, camera);
}

function _isTileBigOnScreen(camera, node) {
    const onScreen = camera.box3SizeOnScreen(node.geometry.OBB.box3D, node.matrixWorld);

    // onScreen.x/y/z are [-1, 1] so divide by 2
    // (so x = 0.4 means the object width on screen is 40% of the total screen width)
    const dim = {
        x: 0.5 * (onScreen.max.x - onScreen.min.x),
        y: 0.5 * (onScreen.max.y - onScreen.min.y),
    };

    // subdivide if on-screen width (and resp. height) is bigger than 30% of the screen width (resp. height)
    // TODO: the 30% value is arbitrary and needs to be configurable by the user
    // TODO: we might want to use texture resolution here as well
    return (dim.x >= 0.3 && dim.y >= 0.3);
}

export function planarSubdivisionControl(maxLevel) {
    return function _planarSubdivisionControl(context, layer, node) {
        if (maxLevel <= node.level) {
            return false;
        }

        return _isTileBigOnScreen(context.camera, node);
    };
}
