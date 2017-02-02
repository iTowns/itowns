/**
 * Generated On: 2015-10-5
 * Class: Camera
 * Description: La camera scene, interface avec la camera du 3DEngine.
 */

/* global Float64Array*/

import * as THREE from 'three';

function Camera(width, height) {
    this.ratio = width / height;
    this.FOV = 30;

    this.camera3D = new THREE.PerspectiveCamera(this.FOV, this.ratio);

    // /!\ WARNING Matrix JS are in Float32Array
    this.camera3D.matrixWorld.elements = new Float64Array(16);

    this.camera3D.matrixAutoUpdate = false;
    this.camera3D.rotationAutoUpdate = false;

    this.direction = new THREE.Vector3();
    this.frustum = new THREE.Frustum();
    this.viewMatrix = new THREE.Matrix4();
    this.width = width;
    this.height = height;
}

/**
 */
Camera.prototype.position = function position() {
    return this.camera3D.position;
};

Camera.prototype.resize = function resize(width, height) {
    this.width = width;
    this.height = height;
    this.ratio = width / height;

    this.camera3D.aspect = this.ratio;
    this.camera3D.updateProjectionMatrix();

    if (this.cameraHelper) {
        var dir = new THREE.Vector3(0, 0, -1);
        var quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.HFOV / 2);
        dir.applyQuaternion(quaternion);

        this.arrowHelper.setDirection(dir);
        this.cameraHelper.update();
    }
};

Camera.prototype.update = function update() {
    var vector = new THREE.Vector3(0, 0, 1);

    this.direction = vector.applyQuaternion(this.camera3D.quaternion);

    this.updateMatrixWorld();
    this.viewMatrix.multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse);
    this.frustum.setFromMatrix(this.viewMatrix);
};

Camera.prototype.updateMatrixWorld = function updateMatrixWorld() {
    this.camera3D.updateMatrix();
    this.camera3D.updateMatrixWorld(true);
    this.camera3D.matrixWorldInverse.getInverse(this.camera3D.matrixWorld);
};

Camera.prototype.getDistanceFromOrigin = function getDistanceFromOrigin() {
    return this.camera3D.position.length();
};

Camera.prototype.setPosition = function setPosition(position) {
    this.camera3D.position.copy(position);
};

Camera.prototype.setRotation = function setRotation(rotation) {
    this.camera3D.quaternion.copy(rotation);
};

Camera.prototype.getFrustum = function getFrustum() {
    this.updateMatrixWorld();
    this.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));

    return this.frustum;
};

Camera.prototype.getFrustumLocalSpace = function getFrustumLocalSpace(position, quaternion) {
    var m = new THREE.Matrix4();

    m.makeRotationFromQuaternion(quaternion.inverse());
    m.setPosition(position.negate().applyQuaternion(quaternion));

    var f = new THREE.Frustum();
    f.setFromMatrix(m.premultiply(this.camera3D.projectionMatrix));
    return f;
};


export default Camera;
