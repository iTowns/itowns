/**
 * Generated On: 2016-11-15
 * Class: TreeUpdater
 * Description: Updaters for Quadtrees.
 */

import * as THREE from 'three';

function TreeUpdater(nodeProcess) {
    this.process = nodeProcess;
}

TreeUpdater.prototype.update = function (params) {
    this.browse(params.layer, params.cam, this.process, params.layersConfig, params.sceneParams);
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
    this._selectNode(params.layer, params.id);
};

TreeUpdater.prototype.uniformsProcess = (function () {
    var positionWorld = new THREE.Vector3();

    return function (node, camera, sceneParams) {
        node.setMatrixRTC(camera.getRTCMatrixFromCenter(positionWorld.setFromMatrixPosition(node.matrixWorld)));
        node.setFog(sceneParams.fogDistance);
        node.setSelected(sceneParams.selectedNodeId === node.id);
    };
}());

TreeUpdater.prototype._selectNode = function (node, id) {
    if (node.id === id) {
        /* eslint-disable no-alert, no-console */
        console.info(node);
        /* eslint-enable no-alert, no-console */
    } else {
        applyFunctionToChildren(n => this._selectNode(n, id), node);
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
TreeUpdater.prototype.browse = function (tree, camera, process, layersConfig, sceneParams) {
    camera.updateMatrixWorld();

    var fogDistance = sceneParams.fogDistance * Math.pow((camera.getDistanceFromOrigin() - 6300000) / 25000000, 1.6);
    sceneParams.fogDistance = fogDistance;

    process.prepare(camera);

    var params = {
        sceneParams,
        tree,
        layersConfig,
        fogDistance,
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
TreeUpdater.prototype._browseDisplayableNode = function (node, camera, process, params) {
    if (node.parent.isVisible() && process.processNode(node, camera, params)) {
        if (node.isDisplayed()) {
            this.uniformsProcess(node, camera, params.sceneParams);
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

TreeUpdater.prototype._browseNonDisplayableNode = function (node, level, process, camera, params) {
    // update node's sse value
    node.sse = camera.computeNodeSSE(node);
    node.setDisplayed(false);

    var sse = process.checkNodeSSE(node);

    if (!sse && !node.loaded) {
        // Make sure this node is not stuck in a !loaded state
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


export default TreeUpdater;
