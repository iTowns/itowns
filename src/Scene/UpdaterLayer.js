/**
 * Generated On: 2016-11-15
 * Class: UpdaterLayer
 * Description: Updaters for Layers.
 */

function UpdaterLayer(args) {
    this.node = args.node;
    this.gfxEngine = args.scene.gfxEngine;
}

UpdaterLayer.prototype.update = function (params) {
    if (!params.layer.visible)
        { return; }

    var root = params.layer.children[0];

    for (var c = 0; c < root.children.length; c++) {
        var node = root.children[c];

        var cRTC = function () {
            var mRTC = this.gfxEngine.getRTCMatrixFromNode(node, params.camera);

            return function (obj) {
                if (obj.setMatrixRTC)
                    { obj.setMatrixRTC(mRTC); }
            };
        };

        node.traverse(cRTC);
    }
};

export default UpdaterLayer;
