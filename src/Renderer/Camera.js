/**
 * Wrapper around three.js camera to expose some geographic helpers.
 */

import * as THREE from 'three';
import Coordinates from '../Core/Geographic/Coordinates';

function Camera(crs, width, height, options = {}) {
    Object.defineProperty(this, 'crs', { get: () => crs });

    this.camera3D = options.camera ? options.camera : new THREE.PerspectiveCamera(30, width / height);

    this._viewMatrix = new THREE.Matrix4();
    this.width = width;
    this.height = height;
}

function resize(camera, width, height) {
    camera.width = width;
    camera.height = height;
    const ratio = width / height;

    if (camera.camera3D.aspect !== ratio) {
        camera.camera3D.aspect = ratio;
        if (camera.camera3D.isOrthographicCamera) {
            const halfH = (camera.camera3D.right - camera.camera3D.left) * 0.5 / ratio;
            camera.camera3D.top = halfH;
            camera.camera3D.bottom = -halfH;
        }
    }

    if (camera.camera3D.updateProjectionMatrix) {
        camera.camera3D.updateProjectionMatrix();
    }
}

Camera.prototype.update = function update(width, height) {
    resize(this, width, height);

    // update matrix
    this.camera3D.updateMatrixWorld();

    // keep our visibility testing matrix ready
    this._viewMatrix.multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse);
};

/**
 * Return the position in the requested CRS, or in camera's CRS if undefined.
 * @param {string} crs if defined (e.g 'EPSG:4236') the camera position will be returned in this CRS
 * @return {Coordinates} Coordinates object holding camera's position
 */
Camera.prototype.position = function position(crs) {
    return new Coordinates(this.crs, this.camera3D.position).as(crs || this.crs);
};

/**
 * Set the position of the camera using a Coordinates object.
 * If you want to modify the position directly using x,y,z value then use camera.camera3D.position.set(x, y, z)
 * @param {Coordinates} position the new position of the camera
 */
Camera.prototype.setPosition = function setPosition(position) {
    this.camera3D.position.copy(position.as(this.crs).xyz());
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
