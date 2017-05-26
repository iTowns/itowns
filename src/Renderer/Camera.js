// Camera is a thin GIS wrapper around Three.js camera (see [Camera](https://threejs.org/docs/#api/cameras/Camera)).
//
// Controlling the camera can be done in 2 ways, usually mutually exclusive:
//   - using a Control class (see GlobeControls* for instance)
//   - or manually positionning the camera using Three.js Object3D API.
//
// Properties:
// - *.camera3D:* underlying Three.js camera
// - *.ratio:* rendering area ratio

/* global Float64Array*/

import * as THREE from 'three';
import Coordinates from '../Core/Geographic/Coordinates';

// ### Camera
// This method will instanciate a Three.js [PerspectiveCamera](https://threejs.org/docs/#api/cameras/PerspectiveCamera)
// Arguments:
// - *crs:* cartesian CRS used to position camera and objects in the world
// - *width:* rendering area width
// - *height:* rendering area height
function Camera(crs, width, height) {
    this._crs = crs;
    this.ratio = width / height;

    this.camera3D = new THREE.PerspectiveCamera(30, this.ratio);

    /* /!\ WARNING Matrix JS are in Float32Array */
    this.camera3D.matrixWorld.elements = new Float64Array(16);

    this.camera3D.matrixAutoUpdate = false;
    this.camera3D.rotationAutoUpdate = false;

    this._viewMatrix = new THREE.Matrix4();
    this._visibilityTestingOffset = new THREE.Vector3();
}

// ### position
// Returns camera current position as Coordinates* object
Camera.prototype.position = function position() {
    return new Coordinates(this._crs, this.camera3D.position);
};

// ### resize
// Update camera based on the new rendering area size.
// Called by View*'s resize event listener, so you probably don't need to worry about this.
Camera.prototype.resize = function resize(width, height) {
    this.ratio = width / height;

    this.camera3D.aspect = this.ratio;
    this.camera3D.updateProjectionMatrix();
};

// ### update
// Update the internal state.
// This is called at the beginning of each update cycle by MainLoop*
Camera.prototype.update = function update() {
    /* update matrix */
    this.camera3D.updateMatrix();
    this.camera3D.updateMatrixWorld();

    /* keep our visibility testing matrix ready */
    this._visibilityTestingOffset.setFromMatrixPosition(this.camera3D.matrixWorld);
    const c = this.camera3D.matrixWorld;
    /* cancel out translation */
    c.setPosition({ x: 0, y: 0, z: 0 });
    this._viewMatrix.getInverse(c);
    this._viewMatrix.premultiply(this.camera3D.projectionMatrix);
    /* restore translation */
    c.setPosition(this._visibilityTestingOffset);
};

const temp = new THREE.Vector3();
const frustum = new THREE.Frustum();
const obbViewMatrix = new THREE.Matrix4();

// ### isBox3DVisible
// Returns true if *box3d* is visible by this camera, given the *matrixWorld* transformation.
//
// Arguments:
//   - *box3d:* a [Box3](https://threejs.org/docs/#api/math/Box3) instance
//   - *matrixWorld:* a [Matrix4](https://threejs.org/docs/#api/math/Matrix4)
Camera.prototype.isBox3DVisible = function isBox3DVisible(box3d, matrixWorld) {
    temp.setFromMatrixPosition(matrixWorld);
    matrixWorld.elements[12] -= this._visibilityTestingOffset.x;
    matrixWorld.elements[13] -= this._visibilityTestingOffset.y;
    matrixWorld.elements[14] -= this._visibilityTestingOffset.z;

    obbViewMatrix.multiplyMatrices(this._viewMatrix, matrixWorld);

    matrixWorld.setPosition(temp);

    frustum.setFromMatrix(obbViewMatrix);
    return frustum.intersectsBox(box3d);
};

// ### box3DSizeOnScreen
// Returns a [Box3](https://threejs.org/docs/#api/math/Box3) projected on the screen.
//
// The resulting object will be a Box3 describing the area covered on screen by a given object
// (x,y will go from -1: left/top to 1: right, bottom).
//
// Arguments:
//   - *box3d:* a [Box3](https://threejs.org/docs/#api/math/Box3) instance
//   - *matrixWorld:* a [Matrix4](https://threejs.org/docs/#api/math/Matrix4)
Camera.prototype.box3DSizeOnScreen = function box3DSizeOnScreen(box3d, matrixWorld) {
    const c = box3d.clone();
    const m = matrixWorld ? matrixWorld.clone() : new THREE.Matrix4();
    m.elements[12] -= this._visibilityTestingOffset.x;
    m.elements[13] -= this._visibilityTestingOffset.y;
    m.elements[14] -= this._visibilityTestingOffset.z;
    m.premultiply(this._viewMatrix);

    return c.applyMatrix4(m);
};

export default Camera;
