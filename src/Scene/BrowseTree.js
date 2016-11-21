/**
 * Generated On: 2015-10-5
 * Class: BrowseTree
 * Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
 */

import * as THREE from 'three';

function BrowseTree() {
}

BrowseTree.uniformsProcess = (function () {
    var positionWorld = new THREE.Vector3();

    return function (node, camera, sceneParams) {
        node.setMatrixRTC(camera.getRTCMatrixFromCenter(positionWorld.setFromMatrixPosition(node.matrixWorld)));
        node.setFog(sceneParams.fogDistance);
        node.setSelected(sceneParams.selectedNodeId === node.id);
    };
}());

BrowseTree.selectNode = function (node, id) {
    if (node.id === id) {
        /* eslint-disable no-alert, no-console */
        console.info(node);
        /* eslint-enable no-alert, no-console */
    } else {
        applyFunctionToChildren(n => BrowseTree.selectNode(n, id), node);
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
BrowseTree.browse = function (tree, camera, process, layersConfig, sceneParams) {
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
    applyFunctionToChildren(n => BrowseTree._browseDisplayableNode(n, camera, process, params), rootNode);
};

/**
 * @documentation: Recursive traverse tree
 * @param {type} node       : current node
 * @param {type} camera     : current camera
 * @param {type} process    : the process to apply to each node
 * @param {type} optional   : optional process
 * @returns {undefined}
 */
BrowseTree._browseDisplayableNode = function (node, camera, process, params) {
    if (node.parent.isVisible() && process.processNode(node, camera, params)) {
        if (node.isDisplayed()) {
            this.uniformsProcess(node, camera, params.sceneParams);
            applyFunctionToChildren(n => BrowseTree._browseNonDisplayableNode(n, node.level + 2, process, camera, params), node);
        } else {
            applyFunctionToChildren(n => BrowseTree._browseDisplayableNode(n, camera, process, params), node);
        }
    } else {
        node.setVisibility(false);
        node.setDisplayed(false);

        applyFunctionToChildren(n => BrowseTree._browseNonDisplayableNode(n, node.level + 2, process, camera, params), node);
    }
};

BrowseTree._browseNonDisplayableNode = function (node, level, process, camera, params) {
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
            if (BrowseTree._browseNonDisplayableNode(node.children[i], level, process, camera, params)) {
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

export default BrowseTree;
