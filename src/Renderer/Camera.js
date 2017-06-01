/**
 * Generated On: 2015-10-5
 * Class: Camera
 * Description: La camera scene, interface avec la camera du 3DEngine.
 */

/* global Float64Array*/

import * as THREE from 'three';

function Camera(width, height, options = {}) {
    this.ratio = width / height;

    this.camera3D = options.camera ? options.camera : new THREE.PerspectiveCamera(30, this.ratio);


    if (!options.camera) {
        // do not modify a camera we don't own fully
        // /!\ WARNING Matrix JS are in Float32Array
        this.camera3D.matrixWorld.elements = new Float64Array(16);
        this.camera3D.matrixAutoUpdate = false;
        this.camera3D.rotationAutoUpdate = false;
    }

    this._viewMatrix = new THREE.Matrix4();
    this._visibilityTestingOffset = new THREE.Vector3();
    this.width = width;
    this.height = height;
}

Camera.prototype.position = function position() {
    return this.camera3D.position;
};

Camera.prototype.resize = function resize(width, height) {
    this.width = width;
    this.height = height;
    this.ratio = width / height;

    if (this.camera3D.aspect !== this.ratio) {
        this.camera3D.aspect = this.ratio;
        if (this.camera3D.isOrthographicCamera) {
            const halfH = (this.camera3D.right - this.camera3D.left) * 0.5 / this.ratio;
            this.camera3D.top = halfH;
            this.camera3D.bottom = -halfH;
        }
    }

    this.camera3D.updateProjectionMatrix();
};

Camera.prototype.update = function update() {
    // update matrix
    this.camera3D.updateMatrix();
    this.camera3D.updateMatrixWorld();

    // keep our visibility testing matrix ready
    this._visibilityTestingOffset.setFromMatrixPosition(this.camera3D.matrixWorld);
    const c = this.camera3D.matrixWorld;
    // cancel out translation
    c.setPosition({ x: 0, y: 0, z: 0 });
    this._viewMatrix.getInverse(c);
    this._viewMatrix.premultiply(this.camera3D.projectionMatrix);
    // restore translation
    c.setPosition(this._visibilityTestingOffset);
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

const temp = new THREE.Vector3();
const frustum = new THREE.Frustum();
const obbViewMatrix = new THREE.Matrix4();
const tempMatrix = new THREE.Matrix4();
const tempBox3d = new THREE.Box3();

function _prepareBox3AndMatrix(box3d, matrixWorld, visibilityTestingOffset) {
    if (matrixWorld) {
        tempMatrix.copy(matrixWorld);
    } else {
        tempMatrix.identity();
    }

    box3d.getCenter(temp);
    // temp is -center
    temp.negate();
    // shift the box3d toward origin
    tempBox3d.copy(box3d);
    tempBox3d.translate(temp);

    // modify position: substract camera.position and add box3d.min
    tempMatrix.elements[12] -= visibilityTestingOffset.x + temp.x;
    tempMatrix.elements[13] -= visibilityTestingOffset.y + temp.y;
    tempMatrix.elements[14] -= visibilityTestingOffset.z + temp.z;
}

Camera.prototype.isBox3DVisible = function isBox3DVisible(box3d, matrixWorld) {
    _prepareBox3AndMatrix(box3d, matrixWorld, this._visibilityTestingOffset);

    obbViewMatrix.multiplyMatrices(this._viewMatrix, tempMatrix);
    frustum.setFromMatrix(obbViewMatrix);

    return frustum.intersectsBox(tempBox3d);
};

Camera.prototype.box3DSizeOnScreen = function box3DSizeOnScreen(box3d, matrixWorld) {
    _prepareBox3AndMatrix(box3d, matrixWorld, this._visibilityTestingOffset);
    tempMatrix.premultiply(this._viewMatrix);

    return tempBox3d.applyMatrix4(tempMatrix);
};

Camera.prototype.isSphereVisible = function isSphereVisible(sphere, matrixWorld) {
    temp.setFromMatrixPosition(matrixWorld);
    matrixWorld.elements[12] -= this._visibilityTestingOffset.x;
    matrixWorld.elements[13] -= this._visibilityTestingOffset.y;
    matrixWorld.elements[14] -= this._visibilityTestingOffset.z;

    obbViewMatrix.multiplyMatrices(this._viewMatrix, matrixWorld);

    matrixWorld.setPosition(temp);

    frustum.setFromMatrix(obbViewMatrix);
    return frustum.intersectsSphere(sphere);
};

export default Camera;
