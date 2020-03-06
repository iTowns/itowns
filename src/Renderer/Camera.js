/**
 * Wrapper around three.js camera to expose some geographic helpers.
 */

import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import DEMUtils from 'Utils/DEMUtils';

function updatePreSse(camera, height, fov) {
    // sse = projected geometric error on screen plane from distance
    // We're using an approximation, assuming that the geometric error of all
    // objects is perpendicular to the camera view vector (= we always compute
    // for worst case).
    //
    //            screen plane             object
    //               |                         __
    //               |                        /  \
    //               |             geometric{|
    //  < fov angle  . } sse          error {|    |
    //               |                        \__/
    //               |
    //               |<--------------------->
    //               |        distance
    //
    //              geometric_error * screen_width      (resp. screen_height)
    //     =  ---------------------------------------
    //        2 * distance * tan (horizontal_fov / 2)   (resp. vertical_fov)
    //
    //
    // We pre-compute the preSSE (= constant part of the screen space error formula) once here

    const verticalFOV = THREE.MathUtils.degToRad(fov);
    const verticalPreSSE = height / (2.0 * Math.tan(verticalFOV * 0.5));

    // Note: the preSSE for the horizontal FOV is the same value
    // focale = (this.height * 0.5) / Math.tan(verticalFOV * 0.5);
    // horizontalFOV = 2 * Math.atan(this.width * 0.5 / focale);
    // horizontalPreSSE = this.width / (2.0 * Math.tan(horizontalFOV * 0.5)); (1)
    // => replacing horizontalFOV in Math.tan(horizontalFOV * 0.5)
    // Math.tan(horizontalFOV * 0.5) = Math.tan(2 * Math.atan(this.width * 0.5 / focale) * 0.5)
    //                               = Math.tan(Math.atan(this.width * 0.5 / focale))
    //                               = this.width * 0.5 / focale
    // => now replacing focale
    //                               = this.width * 0.5 / (this.height * 0.5) / Math.tan(verticalFOV * 0.5)
    //                               = Math.tan(verticalFOV * 0.5) * this.width / this.height
    // => back to (1)
    // horizontalPreSSE = this.width / (2.0 * Math.tan(verticalFOV * 0.5) * this.width / this.height)
    //                  = this.height / 2.0 * Math.tan(verticalFOV * 0.5)
    //                  = verticalPreSSE
    camera._preSSE = verticalPreSSE;
}

function Camera(crs, width, height, options = {}) {
    Object.defineProperty(this, 'crs', { get: () => crs });

    this.camera3D = options.camera ? options.camera : new THREE.PerspectiveCamera(30, width / height);

    this._viewMatrix = new THREE.Matrix4();
    this.width = width;
    this.height = height;
    this._viewMatrixNeedsUpdate = true;
    this.resize(width, height);

    this._preSSE = Infinity;

    if (this.camera3D.isPerspectiveCamera) {
        let fov = this.camera3D.fov;
        Object.defineProperty(this.camera3D, 'fov', {
            get: () => fov,
            set: (newFov) => {
                fov = newFov;
                updatePreSse(this, this.height, fov);
            },
        });
    }
}

Camera.prototype.resize = function resize(width, height) {
    this.width = width;
    this.height = height;

    const ratio = width / height;
    updatePreSse(this, this.height, this.camera3D.fov);

    if (this.camera3D.aspect !== ratio) {
        this.camera3D.aspect = ratio;
        if (this.camera3D.isOrthographicCamera) {
            const halfH = (this.camera3D.right - this.camera3D.left) * 0.5 / ratio;
            const y = (this.camera3D.top + this.camera3D.bottom) * 0.5;
            this.camera3D.top = y + halfH;
            this.camera3D.bottom = y - halfH;
        }
    }

    if (this.camera3D.updateProjectionMatrix) {
        this.camera3D.updateProjectionMatrix();
        this._viewMatrixNeedsUpdate = true;
    }
};

Camera.prototype.update = function update() {
    // update matrix
    this.camera3D.updateMatrixWorld();
    this._viewMatrixNeedsUpdate = true;
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
    this.camera3D.position.copy(position.as(this.crs));
};

const tmp = {
    frustum: new THREE.Frustum(),
    matrix: new THREE.Matrix4(),
    box3: new THREE.Box3(),
};

const points = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
];

function projectBox3PointsInCameraSpace(camera, box3, matrixWorld) {
    // Projects points in camera space
    // We don't project directly on screen to avoid artifacts when projecting
    // points behind the near plane.
    let m = camera.camera3D.matrixWorldInverse;
    if (matrixWorld) {
        m = tmp.matrix.multiplyMatrices(camera.camera3D.matrixWorldInverse, matrixWorld);
    }
    points[0].set(box3.min.x, box3.min.y, box3.min.z).applyMatrix4(m);
    points[1].set(box3.min.x, box3.min.y, box3.max.z).applyMatrix4(m);
    points[2].set(box3.min.x, box3.max.y, box3.min.z).applyMatrix4(m);
    points[3].set(box3.min.x, box3.max.y, box3.max.z).applyMatrix4(m);
    points[4].set(box3.max.x, box3.min.y, box3.min.z).applyMatrix4(m);
    points[5].set(box3.max.x, box3.min.y, box3.max.z).applyMatrix4(m);
    points[6].set(box3.max.x, box3.max.y, box3.min.z).applyMatrix4(m);
    points[7].set(box3.max.x, box3.max.y, box3.max.z).applyMatrix4(m);

    // In camera space objects are along the -Z axis
    // So if min.z is > -near, the object is invisible
    let atLeastOneInFrontOfNearPlane = false;
    for (let i = 0; i < 8; i++) {
        if (points[i].z <= -camera.camera3D.near) {
            atLeastOneInFrontOfNearPlane = true;
        } else {
            // Clamp to near plane
            points[i].z = -camera.camera3D.near;
        }
    }

    return atLeastOneInFrontOfNearPlane ? points : undefined;
}

const ndcBox3 = new THREE.Box3(
    new THREE.Vector3(-1, -1, -1),
    new THREE.Vector3(1, 1, 1));

Camera.prototype.isBox3Visible = function isBox3Visible(box3, matrixWorld) {
    return this.box3SizeOnScreen(box3, matrixWorld).intersectsBox(ndcBox3);
};

Camera.prototype.isSphereVisible = function isSphereVisible(sphere, matrixWorld) {
    if (this._viewMatrixNeedsUpdate) {
        // update visibility testing matrix
        this._viewMatrix.multiplyMatrices(this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse);
        this._viewMatrixNeedsUpdate = false;
    }
    if (matrixWorld) {
        tmp.matrix.multiplyMatrices(this._viewMatrix, matrixWorld);
        tmp.frustum.setFromProjectionMatrix(tmp.matrix);
    } else {
        tmp.frustum.setFromProjectionMatrix(this._viewMatrix);
    }
    return tmp.frustum.intersectsSphere(sphere);
};

Camera.prototype.box3SizeOnScreen = function box3SizeOnScreen(box3, matrixWorld) {
    const pts = projectBox3PointsInCameraSpace(this, box3, matrixWorld);

    // All points are in front of the near plane -> box3 is invisible
    if (!pts) {
        return tmp.box3.makeEmpty();
    }

    // Project points on screen
    for (let i = 0; i < 8; i++) {
        pts[i].applyMatrix4(this.camera3D.projectionMatrix);
    }

    return tmp.box3.setFromPoints(pts);
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
            const difElevation = camLocation.altitude - (elevationUnderCamera + minDistanceCollision);
            // We move the camera to avoid collisions if too close to terrain
            if (difElevation < 0) {
                camLocation.altitude = elevationUnderCamera + minDistanceCollision;
                view.camera.camera3D.position.copy(camLocation.as(view.referenceCrs));
                view.notifyChange(this.camera3D);
            }
        }
    }
};

export default Camera;
