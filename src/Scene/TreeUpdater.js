/**
 * Generated On: 2016-11-15
 * Class: TreeUpdater
 * Description: Updaters for Quadtrees.
 */

import BrowseTree from 'Scene/BrowseTree';

function TreeUpdater(nodeProcess) {
    this.process = nodeProcess;
}

TreeUpdater.prototype.update = function (params) {
    BrowseTree.browse(params.layer, params.cam, this.process, params.layersConfig, params.sceneParams);
};

TreeUpdater.prototype.updateMaterial = function (params) {
    for (var a = 0; a < params.layer.children.length; ++a) {
        var root = params.layer.children[a];
        for (var c = 0; c < root.children.length; c++) {
            var node = root.children[c];
            var lookMaterial = function (obj) {
                obj.material.uniforms[params.uniformName].value = params.value;
            };
            if (node.traverse)
                { node.traverse(lookMaterial); }
        }
    }
};

TreeUpdater.prototype.selectNode = function (params) {
    BrowseTree.selectNode(params.layer, params.id);
};

export default TreeUpdater;
