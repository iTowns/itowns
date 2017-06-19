/**
 * Generated On: 2015-10-5
 * Class: Camera
 * Description: La camera scene, interface avec la camera du 3DEngine.
 */

import * as THREE from 'three';

function Camera(width, height, options = {}) {
    this.ratio = width / height;

    this.camera3D = options.camera ? options.camera : new THREE.PerspectiveCamera(30, this.ratio);

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
const localViewMatrix = new THREE.Matrix4();
const tempMatrix = new THREE.Matrix4();
const tempBox3d = new THREE.Box3();
const tempSphere3d = new THREE.Sphere();
function _prepareMatrix(matrixWorld, visibilityTestingOffset, volumes3D, tempContainer) {
    if (matrixWorld) {
        tempMatrix.copy(matrixWorld);
    } else {
        tempMatrix.identity();
    }
    if (volumes3D.getCenter) {
        // THREE.Box objects have a .getCenter method
        volumes3D.getCenter(temp);
    } else if (volumes3D.center) {
        // THREE.Sphere objects have a .center property
        temp.copy(volumes3D.center);
    } else {
        throw new Error(`Unsupported volume object ${volumes3D}`);
    }
    // temp is -center
    temp.negate();
    // shift the volumes3D toward origin
    tempContainer.copy(volumes3D);
    tempContainer.translate(temp);

    // modify position: substract camera.position and add box3d.min
    tempMatrix.elements[12] -= visibilityTestingOffset.x + temp.x;
    tempMatrix.elements[13] -= visibilityTestingOffset.y + temp.y;
    tempMatrix.elements[14] -= visibilityTestingOffset.z + temp.z;
}

Camera.prototype.isBox3DVisible = function isBox3DVisible(box3d, matrixWorld) {
    _prepareMatrix(matrixWorld, this._visibilityTestingOffset, box3d, tempBox3d);

    localViewMatrix.multiplyMatrices(this._viewMatrix, tempMatrix);
    frustum.setFromMatrix(localViewMatrix);
    return frustum.intersectsBox(tempBox3d);
};

Camera.prototype.isSphereVisible = function isSphereVisible(sphere, matrixWorld) {
    _prepareMatrix(matrixWorld, this._visibilityTestingOffset, sphere, tempSphere3d);

    localViewMatrix.multiplyMatrices(this._viewMatrix, tempMatrix);
    frustum.setFromMatrix(localViewMatrix);
    return frustum.intersectsSphere(tempSphere3d);
};

Camera.prototype.box3DSizeOnScreen = function box3DSizeOnScreen(box3d, matrixWorld) {
    _prepareMatrix(matrixWorld, this._visibilityTestingOffset, box3d, tempBox3d);
    tempMatrix.premultiply(this._viewMatrix);

    return tempBox3d.applyMatrix4(tempMatrix);
};

export default Camera;
