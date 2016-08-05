/**
 * Generated On: 2015-10-5
 * Class: BrowseTree
 * Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
 */

import THREE from 'THREE';

function BrowseTree(engine) {
    //Constructor

    this.oneNode = 0;
    this.gfxEngine = engine;
    this.nodeProcess = undefined;
    this.tree = undefined;
    this.fogDistance = 1000000000.0;
    this.mfogDistance = 1000000000.0;
    this.selectedNodeId = -1;
    this.selectedNode = null;

    this.selectNode = function(node) {
        this._selectNode(node);
    };

    this._resetQuadtreeNode = function(node) {
        node.setVisibility(false);
        node.setDisplayed(false);
        node.setSelected(false);
    };

}

BrowseTree.prototype.addNodeProcess = function(nodeProcess) {
    this.nodeProcess = nodeProcess;
};

BrowseTree.prototype.NodeProcess = function() {
    return this.nodeProcess;
};

BrowseTree.prototype.resetQuadtreeNode = function(node) {
    this._resetQuadtreeNode(node);
};

/**
 * @documentation: Process to apply to each node
 * @param {type} node   : node current to apply process
 * @param {type} camera : current camera needed to process
 * @param {type} enableUp  : optional process
 * @returns {Boolean}
 */
BrowseTree.prototype.quadtreeNodeVisibilityUpdate = function(node, camera, process, params) {
    var wasVisible = node.isVisible();
    var isVisible = !process.isCulled(node, camera);

    this.resetQuadtreeNode(node);
    node.setVisibility(isVisible);

    // Displayed if visible.
    // process.SSE() can modify the displayed property if needed
    // (e.g on subdivision)
    node.setDisplayed(isVisible);

    if (isVisible) {
        process.SSE(node, camera, params);

        this.uniformsProcess(node, camera);
    }

    return wasVisible || isVisible;
};

BrowseTree.prototype.uniformsProcess = function() {

    var positionWorld = new THREE.Vector3();

    return function(node, camera) {

        node.setMatrixRTC(this.gfxEngine.getRTCMatrixFromCenter(positionWorld.setFromMatrixPosition(node.matrixWorld), camera));
        node.setFog(this.fogDistance);

        this.selectNode(node);

    };

}();

BrowseTree.prototype._selectNode = function(node) {
    if (node.id === this.selectedNodeId) {
        node.setSelected(node.visible && node.material.visible);
        if (this.selectedNode !== node) {
            this.selectedNode = node;
            /* eslint-disable no-alert, no-console */
            console.info(node);
            /* eslint-enable no-alert, no-console */
        }
    }
};

/**
 * @documentation: Initiate traverse tree
 * @param {type} tree       : tree
 * @param {type} camera     : current camera
 * @param {type} process    : the process to apply to each node
 * @param {type} optional   : optional process
 * @returns {undefined}
 */
BrowseTree.prototype.browse = function(tree, camera, process, layersConfig, optional) {
    this.tree = tree;

    camera.updateMatrixWorld();

    this.fogDistance = this.mfogDistance * Math.pow((camera.getDistanceFromOrigin() - 6300000) / 25000000, 1.6);

    process.prepare(camera);

    var action = (optional === 2) ? 'clean' : 'visibility_update';
    var params = {
        tree: this.tree,
        withUp: (optional === 1),
        layersConfig: layersConfig
    };

    var rootNode = tree.children[0];

    for (var i = 0; i < rootNode.children.length; i++) {
        this._browse(rootNode.children[i], camera, process, action, params);
    }

};

/**
 * @documentation: Recursive traverse tree
 * @param {type} node       : current node
 * @param {type} camera     : current camera
 * @param {type} process    : the process to apply to each node
 * @param {type} optional   : optional process
 * @returns {undefined}
 */
BrowseTree.prototype._browse = function(node, camera, process, action, params) {
    switch (action) {
        case 'visibility_update':
            {
                if (this.quadtreeNodeVisibilityUpdate(node, camera, process, params)) {
                    var child_action = node.isDisplayed() ? 'hide_all' : action;
                    for (var i = 0; i < node.children.length; i++) {
                        this._browse(node.children[i], camera, process, child_action, params);
                    }
                }
            }
            break;
        case 'hide_all':
            {
                if (node.isVisible()) {
                    this.resetQuadtreeNode(node);
                    node.setVisibility(!process.isCulled(node, camera));
                    node.setDisplayed(false);
                    for (var j = 0; j < node.children.length; j++) {
                        this._browse(node.children[j], camera, process, action, params);
                    }
                }
            }
            break;
        case 'clean':
            {
                this._clean(node, node.level + 2, process, camera);
            }
            break;
        default:
            {
                //console.error('Unknown action ', action);
            }
    }
};

BrowseTree.prototype._clean = function(node, level, process, camera) {
    // update node's sse value
    node.sse = camera.computeNodeSSE(node);

    var sse = process.checkNodeSSE(node);

    // recursively clean children
    if (node.children.length > 0) {
        var disposableChildrenCount = 0;
        for (var i = 0; i < node.children.length; i++) {
            if (this._clean(node.children[i], level, process, camera)) {
                disposableChildrenCount++;
            }
        }

        // sse means we need to subdivide -> don't try to clean
        if (disposableChildrenCount === node.children.length && !sse) {
            // remove children and update visibility
            node.disposeChildren();
            node.setDisplayed(node.isVisible());
        } else {
            return false;
        }
    }

    var cleanable =
        (node.level >= level) &&
        !sse;

    return cleanable;
};

/*
 * @documentation: Recursive traverse tree to update a material specific uniform
 * @returns {undefined}
 */
BrowseTree.prototype.updateMaterialUniform = function(uniformName, value) {


    for (var a = 0; a < this.tree.children.length; ++a) {
        var root = this.tree.children[a];
        for (var c = 0; c < root.children.length; c++) {

            var node = root.children[c];
            var lookMaterial = function(obj) {

                obj.material.uniforms[uniformName].value = value;
            }.bind(this);

            if (node.traverse)
                node.traverse(lookMaterial);


        }
    }
};

BrowseTree.prototype.updateLayer = function(layer, camera) {

    if (!layer.visible)
        return;

    var root = layer.children[0];

    for (var c = 0; c < root.children.length; c++) {
        var node = root.children[c];

        var cRTC = function() {

            var mRTC = this.gfxEngine.getRTCMatrixFromNode(node, camera);

            return function(obj) {

                if (obj.setMatrixRTC)
                    obj.setMatrixRTC(mRTC);

            };

        }.bind(this)();

        node.traverse(cRTC);
    }
};

BrowseTree.prototype.updateMobileMappingLayer = function(layer, camera) {

    if (!layer.visible)
        return;

    var root = layer.children[0];

    for (var c = 0; c < root.children.length; c++) {

        var node = root.children[c];
        node.setMatrixRTC(this.gfxEngine.getRTCMatrixFromCenter(node.absoluteCenter, camera));

    }
};

export default BrowseTree;
