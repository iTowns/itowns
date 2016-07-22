/**
 * Generated On: 2015-10-5
 * Class: Camera
 * Description: La camera scene, interface avec la camera du 3DEngine.
 */

/* global Float64Array*/

import Node from 'Scene/Node';
import THREE from 'THREE';

function Camera(width, height, debug) {
    //Constructor

    Node.call(this);

    this.ratio = width / height;
    this.FOV = 30;

    this.camera3D = new THREE.PerspectiveCamera(this.FOV, this.ratio);

    // /!\ WARNING Matrix JS are in Float32Array
    this.camera3D.matrixWorld.elements = new Float64Array(16);

    this.camera3D.matrixAutoUpdate = false;
    this.camera3D.rotationAutoUpdate = false;

    this.direction = new THREE.Vector3();
    this.frustum = new THREE.Frustum();
    this.width = width;
    this.height = height;
    this.Hypotenuse = Math.sqrt(this.width * this.width + this.height * this.height);

    var radAngle = this.FOV * Math.PI / 180;
    this.HFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) / this.ratio); // TODO surement faux
    this.HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * this.Hypotenuse / this.width);
    this.preSSE = this.Hypotenuse * (2.0 * Math.tan(this.HYFOV * 0.5));

    this.cameraHelper = debug ? new THREE.CameraHelper(this.camera3D) : undefined;
}

Camera.prototype = Object.create(Node.prototype);

Camera.prototype.constructor = Camera;

/**
 */
Camera.prototype.position = function() {

    return this.camera3D.position;

};

Camera.prototype.camHelper = function() {

    return this.cameraHelper;

};

Camera.prototype.createCamHelper = function() {

    this.cameraHelper = new THREE.CameraHelper(this.camera3D);

};

Camera.prototype.matrixWorldInverse = function() {

    return this.camera3D.matrixWorldInverse;
};

Camera.prototype.resize = function(width, height) {

    this.width = width;
    this.height = height;
    this.ratio = width / height;

    this.Hypotenuse = Math.sqrt(this.width * this.width + this.height * this.height);

    var radAngle = this.FOV * Math.PI / 180;

    this.HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * this.Hypotenuse / this.width);

    this.preSSE = this.Hypotenuse * (2.0 * Math.tan(this.HYFOV * 0.5));

    this.camera3D.aspect = this.ratio;

    this.camera3D.updateProjectionMatrix();

};

Camera.prototype.computeNodeSSE = function(node) {

    var boundingSphere = node.geometry.boundingSphere;
    var distance = Math.max(0.0, (this.camera3D.position.distanceTo(node.centerSphere) - boundingSphere.radius));
    // Added small oblique weight (distance is not enough, tile orientation is needed)
    var altiW = node.bbox.maxCarto.altitude === 10000 ? 0. : node.bbox.maxCarto.altitude / 10000.;
    var dotProductW = Math.min(altiW + Math.abs(this.camera3D.getWorldDirection().dot(node.centerSphere.clone().normalize())), 1.);
    if (this.camera3D.position.length() > 6463300) dotProductW = 1;
    var SSE = Math.sqrt(dotProductW) * this.preSSE * (node.geometricError / distance);
    //var SSE = this.preSSE * (node.geometricError / distance);

    return SSE;

};

Camera.prototype.update = function() {
    var vector = new THREE.Vector3(0, 0, 1);

    this.direction = vector.applyQuaternion(this.camera3D.quaternion);

    this.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));

};

Camera.prototype.updateMatrixWorld = function() {
    this.camera3D.updateMatrix();
    this.camera3D.updateMatrixWorld(true);
    this.camera3D.matrixWorldInverse.getInverse(this.camera3D.matrixWorld);

};

Camera.prototype.getDistanceFromOrigin = function() {
    return this.camera3D.position.length();
};

Camera.prototype.setPosition = function(position) {
    this.camera3D.position.copy(position);
};

Camera.prototype.setRotation = function(rotation) {
    this.camera3D.quaternion.copy(rotation);
};

Camera.prototype.getFrustum = function() {

    this.camera3D.updateMatrix();
    this.camera3D.updateMatrixWorld();
    this.camera3D.matrixWorldInverse.getInverse(this.camera3D.matrixWorld);
    this.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));

    return this.frustum;
};

export default Camera;
