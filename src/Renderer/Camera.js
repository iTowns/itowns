/**
 * Wrapper around three.js camera to expose some geographic helpers.
 */

import * as THREE from 'three';
import Coordinates from '../Core/Geographic/Coordinates';
import DEMUtils from '../utils/DEMUtils';

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
            const y = (camera.camera3D.top + camera.camera3D.bottom) * 0.5;
            camera.camera3D.top = y + halfH;
            camera.camera3D.bottom = y - halfH;
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

 /**
 * Test for collision between camera and a geometry layer (DTM/DSM) to adjust camera position
 * It could be modified later to handle an array of geometry layers
 * TODO Improve Coordinates class to handle altitude for any coordinate system (even projected one)
 * @param {view} view where we test the collision between geometry layers and the camera
 * @param {elevationLayer} elevationLayer (DTM/DSM) used to test the collision with the camera. Could be another geometry layer
 * @param {minDistanceCollision} minDistanceCollision the minimum distance allowed between the camera and the surface
 */
Camera.prototype.adjustAltitudeToAvoidCollisionWithLayer = function adjustAltitudeToAvoidCollisionWithLayer(view, elevationLayer, minDistanceCollision) {
    // We put the camera location in geographic by default to easily handle altitude. (Should be improved in Coordinates class for all ref)
    const camLocation = view.camera.position().as('EPSG:4326');
    if (elevationLayer !== undefined) {
        const elevationUnderCamera = DEMUtils.getElevationValueAt(elevationLayer, camLocation);
        if (elevationUnderCamera != undefined) {
            const difElevation = camLocation.altitude() - (elevationUnderCamera.z + minDistanceCollision);
            // We move the camera to avoid collisions if too close to terrain
            if (difElevation < 0) {
                camLocation.setAltitude(elevationUnderCamera.z + minDistanceCollision);
                view.camera.camera3D.position.copy(camLocation.as(view.referenceCrs).xyz());
                view.notifyChange(true);
            }
        }
    }
};

export default Camera;
