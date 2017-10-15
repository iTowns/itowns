function frustumCullingOBB(node, camera) {
    return camera.isBox3Visible(node.OBB().box3D, node.OBB().matrixWorld);
}

export function panoramaCulling(node, camera) {
    return !frustumCullingOBB(node, camera);
}

function _isTileBiggerThanTexture(camera, textureSize, node) {
    const onScreen = camera.box3SizeOnScreen(
        node.geometry.OBB.box3D,
        node.geometry.OBB.matrixWorld);
    onScreen.min.z = 0;
    onScreen.max.z = 0;

    // give a small boost to central tiles
    const boost = 1 + Math.max(0, 1 - onScreen.getCenter().length());

    const dim = {
        x: 0.5 * (onScreen.max.x - onScreen.min.x) * camera.width,
        y: 0.5 * (onScreen.max.y - onScreen.min.y) * camera.height,
    };

    return (boost * dim.x >= textureSize.x && boost * dim.y >= textureSize.y);
}

export function panoramaSubdivisionControl(maxLevel, textureSize) {
    return function _panoramaSubdivisionControl(context, layer, node) {
        if (maxLevel <= node.level) {
            return false;
        }

        return _isTileBiggerThanTexture(context.camera, textureSize, node);
    };
}
