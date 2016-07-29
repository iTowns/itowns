/**
 * Generated On: 2016-20-07
 * Class: FeatureProcess
 * Description: FeatureProcess effectue une opération sur un Node.
 */

import BoundingBox from 'Scene/BoundingBox';
import Camera from 'Renderer/Camera';
import MathExt from 'Core/Math/MathExtented';
import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';

function FeatureProcess(camera, size, bbox) {
    //Constructor
    this.camera = new Camera();
    this.camera.camera3D = camera.camera3D.clone();

    this.bbox = defaultValue(bbox, new BoundingBox(MathExt.PI_OV_TWO + MathExt.PI_OV_FOUR, MathExt.PI + MathExt.PI_OV_FOUR, 0, MathExt.PI_OV_TWO));

    this.vhMagnitudeSquared = 1.0;

    this.r = defaultValue(size, new THREE.Vector3());
    this.cV = new THREE.Vector3();
}

FeatureProcess.prototype.updateCamera = function(camera) {

    this.camera = new Camera(camera.width, camera.height);
    this.camera.camera3D = camera.camera3D.clone();
};

/**
 * @documentation: Cull node with frustrum and oriented bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {NodeProcess_L7.NodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
 */
var quaternion = new THREE.Quaternion();

FeatureProcess.prototype.frustumCullingOBB = function(node, camera) {

    //position in local space
    var position = node.OBB().worldToLocal(camera.position().clone());
    position.z -= node.distance;
    this.camera.setPosition(position);
    // rotation in local space
    quaternion.multiplyQuaternions( node.OBB().quadInverse(), camera.camera3D.quaternion);
    this.camera.setRotation(quaternion);

    return this.camera.getFrustum().intersectsBox(node.OBB().box3D);
};

/**
 * @documentation: return true if point is occuled by horizon
 * @param {type} point
 * @returns {Boolean}
 */
FeatureProcess.prototype.pointHorizonCulling = function(point) {

    var t = MathExt.divideVectors(point, this.r);
    // Vector VT
    var vT = new THREE.Vector3();
    vT.subVectors(t, this.cV);

    var vtMagnitudeSquared = MathExt.lenghtSquared(vT);
    var dot = -vT.dot(this.cV);
    var isOccluded = dot > this.vhMagnitudeSquared &&
        dot * dot / vtMagnitudeSquared > this.vhMagnitudeSquared;

    return isOccluded;
};

/**
 * @documentation: cull node with horizon
 * @param {type} node
 * @returns {Boolean}
 */
var center = new THREE.Vector3();

FeatureProcess.prototype.horizonCulling = function(node) {

    // horizonCulling Oriented bounding box
    var points = node.OBB().pointsWorld;
    center.setFromMatrixPosition(node.matrixWorld);
    var isVisible = false;
    for (var i = 0, max = points.length; i < max; i++) {
        var point = points[i].add(center);
        if (!this.pointHorizonCulling(point)) {
            isVisible = true;
            break;
        }
    }
    return isVisible;
};

/**
 * @documentation:
 * @param  {type} node  : the node to try to cull
 * @param  {type} camera: the camera used for culling
 * @return {Boolean}      the culling attempt's result
 */
FeatureProcess.prototype.isCulled = function(node, camera) {

    return !( this.frustumCullingOBB(node, camera)&&this.horizonCulling(node, camera));
};

/**
 * Check if the value of the SSE is less than 31.
 * @param node: the node which contains the SSE to check
 */
FeatureProcess.prototype.checkNodeSSE = function(node) {

    //Random value for the SSE, used for the test purpose. Can be changed at any momment
    return 31 < node.sse;
};

/**
 * @documentation: Compute screen space error of node in function of camera
 * @param {type} node
 * @param {type} camera
 * @returns {Boolean}
 */
FeatureProcess.prototype.SSE = function(node, camera) {
    // update node's sse value
    node.sse = camera.computeNodeSSE(node);

    var sse = this.checkNodeSSE(node);

    // display children if possible
    var hidden = sse && node.childrenLoaded();
    node.setDisplayed(!hidden);
};

/**
 * @documentation: return true if point is occuled by horizon
 * @param {type} point
 * @returns {Boolean}
 */
FeatureProcess.prototype.pointHorizonCulling = function(point) {

    var t = MathExt.divideVectors(point, this.r);
    // Vector VT
    var vT = new THREE.Vector3();
    vT.subVectors(t, this.cV);

    var vtMagnitudeSquared = MathExt.lenghtSquared(vT);
    var dot = -vT.dot(this.cV);
    var isOccluded = dot > this.vhMagnitudeSquared &&
        dot * dot / vtMagnitudeSquared > this.vhMagnitudeSquared;

    return isOccluded;
};


/**
 * @documentation:pre calcul for horizon culling
 * @param {type} camera
 * @returns {undefined}
 */
FeatureProcess.prototype.preHorizonCulling = function(camera) {

    this.cV = MathExt.divideVectors(camera.position(), this.r);
    this.vhMagnitudeSquared = MathExt.lenghtSquared(this.cV) - 1.0;
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
FeatureProcess.prototype.prepare = function(camera) {

    this.preHorizonCulling(camera);
};

export default FeatureProcess;
