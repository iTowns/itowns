/**
 * Generated On: 2016-11-15
 * Class: UpdaterLayer
 * Description: Updaters for MobileMappingLayers.
 */

function UpdaterMobileMappingLayer(args) {
    this.node = args.node;
    this.gfxEngine = args.scene.gfxEngine;
}

UpdaterMobileMappingLayer.prototype.update = function (params) {
    if (!params.layer.visible)
        { return; }

    var root = params.layer.children[0];

    for (var c = 0; c < root.children.length; c++) {
        var node = root.children[c];
        node.setMatrixRTC(params.camera.getRTCMatrixFromCenter(node.absoluteCenter));
    }
};

export default UpdaterMobileMappingLayer;
