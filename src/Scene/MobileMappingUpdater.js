/**
 * Generated On: 2016-11-15
 * Class: DefaultUpdater
 * Description: Updaters for MobileMappingLayers.
 */

function MobileMappingUpdater() {
}

MobileMappingUpdater.prototype.update = function (params) {
    if (!params.layer.visible)
        { return; }

    var root = params.layer.children[0];

    for (var c = 0; c < root.children.length; c++) {
        var node = root.children[c];
        node.setMatrixRTC(params.camera.getRTCMatrixFromCenter(node.absoluteCenter));
    }
};

export default MobileMappingUpdater;
