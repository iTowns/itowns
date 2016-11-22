/**
 * Generated On: 2015-10-5
 * Class: ThreeDTilesNodeProcess
 * Description: ThreeDTilesNodeProcess effectue une opération sur un Node.
 */

import BoundingBox from 'Scene/BoundingBox';
import MathExt from 'Core/Math/MathExtented';
import * as THREE from 'three';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';

function ThreeDTilesNodeProcess(camera, ellipsoid, bbox) {
    //Constructor

    this.bbox = defaultValue(bbox, new BoundingBox(MathExt.PI_OV_TWO + MathExt.PI_OV_FOUR, MathExt.PI + MathExt.PI_OV_FOUR, 0, MathExt.PI_OV_TWO));

    this.vhMagnitudeSquared = 1.0;

    this.r = defaultValue(ellipsoid.size, new THREE.Vector3());
    this.cV = new THREE.Vector3();
    this.projection = new Projection();
}

/**
 * @documentation: Apply backface culling on node, change visibility; return true if the node is visible
 * @param {type} node   : node to cull
 * @param {type} camera : camera for the culling
 * @returns {Boolean}
 */
ThreeDTilesNodeProcess.prototype.backFaceCulling = function(node, camera) {
    var normal = camera.direction;
    for (var n = 0; n < node.normals().length; n++) {

        var dot = normal.dot(node.normals()[n]);
        if (dot > 0) {
            node.visible = true;
            return true;
        }
    }

    //??node.visible = true;

    return node.visible;

};

/**
 * @documentation:
 * @param  {type} node  : the node to try to cull
 * @param  {type} camera: the camera used for culling
 * @return {Boolean}      the culling attempt's result
 */
ThreeDTilesNodeProcess.prototype.isCulled = function(node, camera) {
    return !(this.frustumCullingOBB(node, camera) && this.horizonCulling(node, camera));
};

/**
 * @documentation: Cull node with frustrum
 * @param {type} node   : node to cull
 * @param {type} camera : camera for culling
 * @returns {unresolved}
 */
ThreeDTilesNodeProcess.prototype.frustumCulling = function(node, camera) {
    var frustum = camera.frustum;

    return frustum.intersectsObject(node);
};

ThreeDTilesNodeProcess.prototype.checkNodeSSE = function(node) {
    return 6.0 < node.sse || node.level <= 2;
};

ThreeDTilesNodeProcess.prototype.subdivideNode = function(node, camera, params) {
    if (!node.pendingSubdivision && node.noChild()) {
        var bboxes = params.tree.subdivideNode(node);
        node.pendingSubdivision = true;

        for (var i = 0; i < bboxes.length; i++) {
            var bvh = params.tree;

            bvh.requestNewTile(params.layersConfig, bboxes[i], node);   // TODO: .then?

            /*bvh.interCommand.request(args, node).then(function(child) {
                // TODO: set node geometry

                return 0;
            }.bind(this));*/
        }
    }
};


// TODO: is this required?
/*function refinementCommandCancellationFn(cmd) {
    if (!cmd.requester.parent || !cmd.requester.material) {
        return true;
    }
    // If node A is divided into A1, A2, A3, A4 and the user zooms fast enough on A2
    // We might end up in a situation where:
    //    - commands for A1, A3 or A4 are canceled because they're not visible anymore
    //    - A2 A2 cannot be displayed because A won't be hidden until all of its
    //      children are loaded.

    // allow cancellation of the command if the node isn't visible anymore
    return cmd.requester.parent.childrenLoaded() &&
        cmd.requester.visible === false &&
        2 <= cmd.requester.level;
}*/

ThreeDTilesNodeProcess.prototype.hideNodeChildren = function(node) {
    for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        child.setDisplayed(false);
    }
};

ThreeDTilesNodeProcess.prototype.processNode = function(node, camera, params) {
    // TODO: handle replace vs add refinement
    let wasVisible = node.isVisible();
    let isVisible = true;// !this.isCulled(node, camera);

    node.setDisplayed(false);
    node.setSelected(false);

    node.setVisibility(isVisible);
    //console.log(node.id);

    if (isVisible) {
        // update node's sse value
        node.sse = camera.computeNodeSSE(node);
        //console.log("id: " + node.id + " sse: " + node.sse);

        let sse = this.checkNodeSSE(node);
        let hidden = !node.additiveRefinement && sse && node.childrenLoaded() && node.maxChildrenNumber !== 0;

        if (sse && params.tree.canSubdivideNode(node)) {
            // big screen space error: subdivide node, display children if possible
            this.subdivideNode(node, camera, params);
        }

        // display children if possible
        node.setDisplayed(!hidden);

        // todo uniformsProcess
    } else {
        node.setDisplayed(false);
    }

    return wasVisible || isVisible;
}

/**
 * @documentation: Cull node with frustrum and oriented bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {ThreeDTilesNodeProcess_L7.ThreeDTilesNodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
 */

var quaternion = new THREE.Quaternion();

ThreeDTilesNodeProcess.prototype.frustumCullingOBB = function(node, camera) {
    //position in local space
    var position = node.OBB().worldToLocal(camera.position().clone());
    position.z -= node.distance;

    quaternion.multiplyQuaternions( node.OBB().quadInverse(), camera.camera3D.quaternion);

    return camera.getFrustumLocalSpace(position, quaternion).intersectsBox(node.OBB().box3D);
};

/**
 * @documentation: Cull node with frustrum and the bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {unresolved}
 */
ThreeDTilesNodeProcess.prototype.frustumBB = function(node /*, camera*/ ) {
    return node.bbox.intersect(this.bbox);
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
ThreeDTilesNodeProcess.prototype.prepare = function(camera) {
    this.preHorizonCulling(camera);
};

/**
 * @documentation:pre calcul for horizon culling
 * @param {type} camera
 * @returns {undefined}
 */
ThreeDTilesNodeProcess.prototype.preHorizonCulling = function(camera) {
    this.cV.copy(camera.position()).divide(this.r);
    this.vhMagnitudeSquared = this.cV.lengthSq() - 1.0;
};

/**
 * @documentation: return true if point is occuled by horizon
 * @param {type} pt
 * @returns {Boolean}
 */
ThreeDTilesNodeProcess.prototype.pointHorizonCulling = function(pt) {
    var vT = pt.divide(this.r).sub(this.cV);

    var vtMagnitudeSquared = vT.lengthSq();

    var dot = -vT.dot(this.cV);

    var isOccluded =
        this.vhMagnitudeSquared < dot &&
        this.vhMagnitudeSquared < dot * dot / vtMagnitudeSquared;

    return isOccluded;
};

/**
 * @documentation: cull node with horizon
 * @param {type} node
 * @returns {Boolean}
 */
var point = new THREE.Vector3();

ThreeDTilesNodeProcess.prototype.horizonCulling = function(node) {

    // horizonCulling Oriented bounding box
    var points = node.OBB().pointsWorld;
    var isVisible = false;

    var nodePosition = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
    for (var i = 0, max = points.length; i < max; i++) {
        point.addVectors(nodePosition, points[i]);
        if (!this.pointHorizonCulling(point)) {
            isVisible = true;
            break;
        }
    }

    return isVisible;
};

ThreeDTilesNodeProcess.prototype.refineNodeLayers = function(/*node, camera, params*/) {

};

export default ThreeDTilesNodeProcess;
