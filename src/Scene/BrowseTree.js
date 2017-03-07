/**
 * Generated On: 2015-10-5
 * Class: BrowseTree
 * Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
 */

import * as THREE from 'three';

function BrowseTree(engine) {
    // Constructor

    this.oneNode = 0;
    this.gfxEngine = engine;
    this.nodeProcess = undefined;
    this.tree = undefined;
    this.fogDistance = 1000000000.0;
    this.mfogDistance = 1000000000.0;
    this.selectedNodeId = -1;
    this.selectedNode = null;

    this.selectNode = function selectNode(node) {
        this._selectNode(node);
    };
}

BrowseTree.prototype.addNodeProcess = function addNodeProcess(nodeProcess) {
    this.nodeProcess = nodeProcess;
};

BrowseTree.prototype.NodeProcess = function NodeProcess() {
    return this.nodeProcess;
};

BrowseTree.prototype.uniformsProcess = (function getUniformsProcessFn() {
    var positionWorld = new THREE.Vector3();

    return function uniformsProcess(node, camera) {
        node.setMatrixRTC(this.gfxEngine.getRTCMatrixFromCenter(positionWorld.setFromMatrixPosition(node.matrixWorld), camera));
        node.setFog(this.fogDistance);

        this.selectNode(node);
    };
}());

BrowseTree.prototype._selectNode = function _selectNode(node) {
    if (node.id === this.selectedNodeId) {
        node.setSelected(node.visible && node.material.visible);
        if (this.selectedNode !== node) {
            this.selectedNode = node;
            // eslint-disable-next-line no-console
            console.info(node);
        }
    }
};

function applyFunctionToChildren(func, node) {
    for (let i = 0; i < node.children.length; i++) {
        func(node.children[i]);
    }
}

/**
 * @documentation: Initiate traverse tree
 * @param {type} tree       : tree
 * @param {type} camera     : current camera
 * @param {type} process    : the process to apply to each node
 * @param {type} optional   : optional process
 * @returns {undefined}
 */
BrowseTree.prototype.browse = function browse(tree, camera, process, layersConfig) {
    this.tree = tree;

    this.fogDistance = this.mfogDistance * Math.pow((camera.getDistanceFromOrigin() - 6300000) / 25000000, 1.6);

    process.prepare(camera);

    var params = {
        tree: this.tree,
        layersConfig,
    };

    var rootNode = tree.children[0];
    applyFunctionToChildren(n => this._browseDisplayableNode(n, camera, process, params), rootNode);
};

/**
 * @documentation: Recursive traverse tree
 * @param {type} node       : current node
 * @param {type} camera     : current camera
 * @param {type} process    : the process to apply to each node
 * @param {type} optional   : optional process
 * @returns {undefined}
 */
BrowseTree.prototype._browseDisplayableNode = function _browseDisplayableNode(node, camera, process, params) {
    if (node.parent.isVisible() && process.processNode(node, camera, params)) {
        if (node.isDisplayed()) {
            this.uniformsProcess(node, camera);
            applyFunctionToChildren(n => this._browseNonDisplayableNode(n, node.level + 2, process, camera, params), node);
        } else {
            applyFunctionToChildren(n => this._browseDisplayableNode(n, camera, process, params), node);
        }
    } else {
        node.setVisibility(false);
        node.setDisplayed(false);

        applyFunctionToChildren(n => this._browseNonDisplayableNode(n, node.level + 2, process, camera, params), node);
    }
};

BrowseTree.prototype._browseNonDisplayableNode = function _browseNonDisplayableNode(node, level, process, camera, params) {
    // update node's sse value
    node.sse = camera.computeNodeSSE(node);
    node.setDisplayed(false);

    const sse = process.checkNodeSSE(node);
    if (!node.loaded) {
        // Make sure this node is not stuck in a !loaded state
        // TODO: we could be smarter and do this only for visible tiles for instance
        // but we need to be careful due to the number of possible states for a tile (pendingSubdivision,
        // loaded, disposed etc). Also: once this is fixed we should be able to simplify the commandC
        // cancellation function to something like: `return !node.isVisible()`
        process.refineNodeLayers(node, camera, params);
    }

    // recursively clean children
    if (node.children.length > 0) {
        var disposableChildrenCount = 0;
        for (var i = 0; i < node.children.length; i++) {
            if (this._browseNonDisplayableNode(node.children[i], level, process, camera, params)) {
                disposableChildrenCount++;
            }
        }

        // sse means we need to subdivide -> don't try to clean
        if (disposableChildrenCount === node.children.length && !sse) {
            // remove children and update visibility
            node.disposeChildren();
            node.setDisplayed(!node.parent.isDisplayed() && node.isVisible());
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
BrowseTree.prototype.updateMaterialUniform = function updateMaterialUniform(uniformName, value) {
    for (var a = 0; a < this.tree.children.length; ++a) {
        var root = this.tree.children[a];
        for (var c = 0; c < root.children.length; c++) {
            var node = root.children[c];
            var lookMaterial = function lookMaterial(obj) {
                obj.material.uniforms[uniformName].value = value;
            };

            if (node.traverse)
              { node.traverse(lookMaterial); }
        }
    }
};

BrowseTree.prototype.updateLayer = function updateLayer(layer, camera) {
    if (!layer.visible)
        { return; }

    var root = layer.children[0];

    for (let c = 0; c < root.children.length; c++) {
        const node = root.children[c];

        var cRTC = function getCRtcFn() {
            const mRTC = this.gfxEngine.getRTCMatrixFromNode(node, camera);

            return function cRTC(obj) {
                if (obj.setMatrixRTC) {
                    obj.setMatrixRTC(mRTC);
                } else if (obj.material && obj.material.setMatrixRTC) {
                    obj.material.setMatrixRTC(mRTC);
                } else {
                    obj.updateMatrix();
                    if (obj.parent === null) {
                        obj.matrixWorld.copy(obj.matrix);
                    } else {
                        obj.matrixWorld.multiplyMatrices(obj.parent.matrixWorld, obj.matrix);
                    }
                    obj.matrixWorldNeedsUpdate = false;
                }
            };
        }.bind(this)();

        node.traverse(cRTC);
    }
};

BrowseTree.prototype.updateMobileMappingLayer = function updateMobileMappingLayer(layer, camera) {
    if (!layer.visible)
        { return; }

    var root = layer.children[0];

    for (var c = 0; c < root.children.length; c++) {
        var node = root.children[c];
        node.setMatrixRTC(this.gfxEngine.getRTCMatrixFromCenter(node.absoluteCenter, camera));
    }
};

BrowseTree.prototype.updateQuadtree = function updateQuadtree(layer, layersConfiguration, camera) {
    var quadtree = layer.node.tiles;

    this.browse(quadtree, camera, layer.process, layersConfiguration);
};

export default BrowseTree;
