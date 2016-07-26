/**
 * Generated On: 2015-10-5
 * Class: BuildingTileNodeProcess
 * Description: BuildingTileNodeProcess effectue une opération sur un Node.
 */

import BoundingBox from 'Scene/BoundingBox';
import Camera from 'Renderer/Camera';
import MathExt from 'Core/Math/MathExtented';
import InterfaceCommander from 'Core/Commander/InterfaceCommander';
import THREE from 'THREE';


function BuildingTileNodeProcess() {
    //Constructor
    this.camera = new Camera();
    //this.camera.camera3D = camera.camera3D.clone();
    this.additiveRefinement = true;

    this.interCommand = new InterfaceCommander(); // TODO: InterfaceCommander static class?
}

BuildingTileNodeProcess.prototype.updateCamera = function(camera) {
    this.camera = new Camera(camera.width, camera.height);
    this.camera.camera3D = camera.camera3D.clone();
};

/**
 * @documentation:
 * @param  {type} node  : the node to try to cull
 * @param  {type} camera: the camera used for culling
 * @return {Boolean}      the culling attempt's result
 */
BuildingTileNodeProcess.prototype.isCulled = function(node, camera) {
    return !(this.frustumCulling(node, camera));
};

BuildingTileNodeProcess.prototype.checkSSE = function(node, camera) {

    return camera.BoxSSE(node) > 6.0;

};

BuildingTileNodeProcess.prototype.isVisible = function(node, camera) {
    return !this.isCulled(node, camera) && this.checkSSE(node, camera);
};

BuildingTileNodeProcess.prototype.traverseChildren = function(node) {
    return node.visible;
};

BuildingTileNodeProcess.prototype.createCommands = function(node, params) {
    var status = node.getStatus();
    for (var i = 0; i < status.length; i++) {
        this.interCommand.request(status[i], node, params.tree, {});
    }
};

BuildingTileNodeProcess.prototype.subdivideNode = function(node, camera, params) {
    if (!node.pendingSubdivision && node.noChild()) {
        var bboxes = params.tree.subdivideNode(node);
        node.pendingSubdivision = true;

        for (var i = 0; i < bboxes.length; i++) {
            var args = {
                layer: params.layersConfig.getGeometryLayers()[1],
                bbox: bboxes[i].bbox,
                bboxId: bboxes[i].id
            };
            var quadtree = params.tree;

            quadtree.interCommand.request(args, node);
        }
    }
};

BuildingTileNodeProcess.prototype.checkNodeSSE = function(node) {
    return 6.0 < node.sse;
};

BuildingTileNodeProcess.prototype.SSE = function(node, camera, params) {
    // update node's sse value

    node.sse = camera.computeNodeSSE(node);

    var sse = this.checkNodeSSE(node);
    node.setDisplayed(true);

    if (params.withUp) {
        if (sse) {
            // big screen space error: subdivide node, display children if possible
            this.subdivideNode(node, camera, params);
        }
    }

    /*node.setVisibility(false);
    node.setMaterialVisibility(false);
    if(!this.isCulled(node, camera) && this.checkSSE(node, camera)) {
        this.createCommands(node, params);
        if(node.ready()) {
            if(node.noChild()) {
                params.tree.subdivide(node);
            }
            node.setVisibility(true);
            node.setMaterialVisibility(true);
        }
    }*/
};

/**
 * @documentation: Cull node with frustrum and oriented bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {BuildingTileNodeProcess_L7.BuildingTileNodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
 */

BuildingTileNodeProcess.prototype.frustumCulling = function(node, camera) {
    return camera.getFrustum().intersectsBox(node.box3D);
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
BuildingTileNodeProcess.prototype.prepare = function( /*camera*/ ) {

};


export default BuildingTileNodeProcess;
