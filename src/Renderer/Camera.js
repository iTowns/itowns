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

    if (this.camera3D.updateProjectionMatrix) {
        this.camera3D.updateProjectionMatrix();
    }
};

Camera.prototype.update = function update() {
    // update matrix
    this.camera3D.updateMatrixWorld();

    // keep our visibility testing matrix ready
    this._viewMatrix.multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse);
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

const tmp = {
    frustum: new THREE.Frustum(),
    matrix: new THREE.Matrix4(),
    box3: new THREE.Box3(),
};

Camera.prototype.isBox3Visible = function isBox3Visible(box3, matrixWorld) {
    if (matrixWorld) {
        tmp.matrix.multiplyMatrices(this._viewMatrix, matrixWorld);
        tmp.frustum.setFromMatrix(tmp.matrix);
    } else {
        tmp.frustum.setFromMatrix(this._viewMatrix);
    }
    return tmp.frustum.intersectsBox(box3);
};

Camera.prototype.isSphereVisible = function isSphereVisible(sphere, matrixWorld) {
    if (matrixWorld) {
        tmp.matrix.multiplyMatrices(this._viewMatrix, matrixWorld);
        tmp.frustum.setFromMatrix(tmp.matrix);
    } else {
        tmp.frustum.setFromMatrix(this._viewMatrix);
    }
    return tmp.frustum.intersectsSphere(sphere);
};

Camera.prototype.box3SizeOnScreen = function box3SizeOnScreen(box3, matrixWorld) {
    tmp.box3.copy(box3);

    if (matrixWorld) {
        tmp.matrix.multiplyMatrices(this._viewMatrix, matrixWorld);
        tmp.box3.applyMatrix4(tmp.matrix);
    } else {
        tmp.box3.applyMatrix4(this._viewMatrix);
    }
    return tmp.box3;
};

export default Camera;
