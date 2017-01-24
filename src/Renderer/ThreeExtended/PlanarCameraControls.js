/**
 * Generated On: 2016-05-18
 * Class: PlanarCameraControls
 * Description: Camera controls adapted for a planar view.
 * Left mouse button translates the camera on the horizontal (xy) plane.
 * Ctrl + left mouse button rotates around the camera's focus point.
 * Scroll wheel zooms and dezooms.
 * Right mouse (or R/F keys) moves the camera up and down.
 */

import * as THREE from 'three';

var scope = null;

var keys = { CTRL: 17, R: 82, F: 70, S: 83 };
var mouseButtons = { LEFTCLICK: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, RIGHTCLICK: THREE.MOUSE.RIGHT };

var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, PANUP: 3 };
var state = STATE.NONE;

var isCtrlDown = false;
var select = false;

var rotateStart = new THREE.Vector2();
var rotateEnd = new THREE.Vector2();
var rotateDelta = new THREE.Vector2();

var theta = 0;
var phi = 0;
var thetaDelta = 0;
var phiDelta = 0;

var panStart = new THREE.Vector2();
var panEnd = new THREE.Vector2();
var panDelta = new THREE.Vector2();

var panOffset = new THREE.Vector3();
var panUpOffset = new THREE.Vector3();

var dollyStart = new THREE.Vector2();

var scale = 1;
var oldScale = 1;

var changeEvent = { type: 'change' };

function PlanarCameraControls(camera, domElement, engine) {
    // Constructor

    scope = this;

    this.camera = camera;
    this.domElement = domElement;
    this.engine = engine;

    this.target = new THREE.Vector3();

    this.minDistanceUp = 0;
    this.maxDistanceUp = Infinity;

    this.minScale = 0;
    this.maxScale = Infinity;

    this.minZoom = 0;
    this.maxZoom = Infinity;

    this.minZenithAngle = 0;
    this.maxZenithAngle = Math.PI;

    this.zoomSpeed = Math.pow(0.95, 1.0);

    //* *********************Keys***********************//
    window.addEventListener('keydown', this.onKeyDown, false);

    //* *********************Mouse**********************//
    this.domElement.addEventListener('mousedown', this.onMouseDown, false);
    this.domElement.addEventListener('mousewheel', this.onMouseWheel, false);
    // For firefox
    this.domElement.addEventListener('MozMousePixelScroll', this.onMouseWheel, false);

    //* *********************Touch**********************//

    this.update();
}

PlanarCameraControls.prototype = Object.create(THREE.EventDispatcher.prototype);
PlanarCameraControls.prototype.constructor = PlanarCameraControls;

PlanarCameraControls.prototype.updateCameraTransformation = function updateCameraTransformation() {};

// Public functions

/**
 * Manage the rotation of the camera around the y and z axis. Change their offset values.
 * @param deltaX : the offset value of the mouse movement along the X axis.
 * @param deltaY : the offset value of the mouse movement along the Y axis.
 */
PlanarCameraControls.prototype.rotate = function rotate(deltaX, deltaY) {
    thetaDelta -= 2 * Math.PI * deltaX / scope.domElement.clientHeight;
    phiDelta -= 2 * Math.PI * deltaY / scope.domElement.clientHeight;
};

/**
 * Manage the translation of the camera along the horizontal (go left or right) line of the world.
 * @param distance : the distance to the target point depending of the windows height.
 * @param matrix : the matrix of the camera.
 */
PlanarCameraControls.prototype.panLeft = function panLeft(distance, matrix) {
    var vector = new THREE.Vector3();

    vector.setFromMatrixColumn(matrix, 0);
    vector.multiplyScalar(-distance);

    panOffset.add(vector);
};

/**
 * Manage the translation of the camera along the horizontal (go forward or backward) line of the world.
 * @param distance : the distance to the target point depending of the windows height.
 * @param matrix : the matrix of the camera.
 */
PlanarCameraControls.prototype.panForward = function panForward(distance, matrix) {
    var vector = new THREE.Vector3();

    if (theta === 0) {
        vector.setFromMatrixColumn(matrix, 1);
        vector.multiplyScalar(distance);
    }
    else {
        vector.set(Math.sin(theta), Math.cos(theta), 0);
        vector.multiplyScalar(-distance);
    }


    panOffset.add(vector);
};

/**
 * Manage the translation of the camera along the vertical (go up or down) line of the world.
 * @param deltaYX : the offset value of the mouse movement along the Y axis.
 */
PlanarCameraControls.prototype.panUp = function panUp(deltaY) {
    var offset = scope.camera.position.clone().sub(scope.target);
    var targetDistance = offset.length();
    targetDistance *= Math.tan((scope.camera.fov / 2) * Math.PI / 180.0);

    var vector = new THREE.Vector3(0, 0, 1);
    vector.multiplyScalar(2 * deltaY * targetDistance / scope.domElement.clientHeight);

    panUpOffset.add(vector);
};

/**
 * Manage the translation of the camera along the horizontal line of the world.
 * @param deltaX : the offset value of the mouse movement along the X axis.
 * @param deltaY : the offset value of the mouse movement along the Y axis.
 */
PlanarCameraControls.prototype.pan = function pan(deltaX, deltaY) {
    var position = scope.camera.position;
    var offset = position.clone().sub(scope.target);
    var targetDistance = offset.length();

    targetDistance *= Math.tan((scope.camera.fov / 2) * Math.PI / 180.0);

    scope.panLeft(2 * deltaX * targetDistance / scope.domElement.clientHeight, scope.camera.matrix);
    scope.panForward(2 * deltaY * targetDistance / scope.domElement.clientHeight, scope.camera.matrix);
};

/**
 * Manage the translation of the camera along the horizontal line of the world.
 * @param deltaX : the offset value of the mouse movement along the X axis.
 * @param deltaY : the offset value of the mouse movement along the Y axis.
 */
PlanarCameraControls.prototype.update = function update() {
    var quat = new THREE.Quaternion().setFromUnitVectors(scope.camera.up, new THREE.Vector3(0, 0, 1));
    var quatInverse = quat.clone().inverse();

    var position = scope.camera.position;
    var offset = new THREE.Vector3();
    offset.copy(position).sub(scope.target);

    // Handle dolly
    scale = Math.max(scope.minScale, Math.min(scope.maxScale, scale));

    // Handle rotation
    if (thetaDelta !== 0 || phiDelta !== 0) {
        if ((phi + phiDelta >= scope.minZenithAngle)
            && (phi + phiDelta <= scope.maxZenithAngle)
            && phiDelta !== 0) {
            offset.applyQuaternion(quat);
            phi += phiDelta;

            var rotationXQuaternion = new THREE.Quaternion();
            var vector = new THREE.Vector3();
            vector.setFromMatrixColumn(scope.camera.matrix, 0);
            rotationXQuaternion.setFromAxisAngle(vector, phiDelta);
            offset.applyQuaternion(rotationXQuaternion);
            offset.applyQuaternion(quatInverse);
        }

        if (thetaDelta !== 0) {
            theta = Math.atan2(offset.x, offset.y);
            theta += thetaDelta;

            var rotationZQuaternion = new THREE.Quaternion();
            rotationZQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), thetaDelta);
            offset.applyQuaternion(rotationZQuaternion);
        }
    }

    // Handle dolly
    var currentScale = scale / oldScale;
    offset.multiplyScalar(currentScale);

    // Move the target to the panned location
    scope.target.add(panOffset);
    if ((position.z + panUpOffset.z > scope.minDistanceUp) &&
        (position.z + panUpOffset.z < scope.maxDistanceUp))
        { scope.target.add(panUpOffset); }

    position.copy(scope.target).add(offset);
    // Handle pan up
    /* if((position.z + panUpOffset.z > scope.minDistanceUp) && (position.z + panUpOffset.z < scope.maxDistanceUp))
        position.add(panUpOffset);*/

    // Always look at the target
    scope.camera.lookAt(scope.target);

    // Reset elements
    thetaDelta = 0;
    phiDelta = 0;
    oldScale = scale;
    panOffset.set(0, 0, 0);
    panUpOffset.set(0, 0, 0);

    scope.dispatchEvent(changeEvent);
};

//* ************************************************************************************//
//* *********************************** Event handlers *********************************//
//* ************************************************************************************//

//* *********************Keys***********************//

/**
 * Manage the event when a key is down.
 * @param event: the current event
 */
PlanarCameraControls.prototype.handleKeyDown = function handleKeyDown(event) {
    switch (event.keyCode) {
        case keys.CTRL:
            if (!isCtrlDown)
                { isCtrlDown = true; }
            break;
        case keys.R:
            // Get the camera up
            scope.panUp(3);
            scope.update();
            break;
        case keys.F:
            // Get the camera down
            scope.panUp(-3);
            scope.update();
            break;
        case keys.S:
            if (!select)
                { select = true; }
            break;
        default:
    }
};

//* *********************Mouse**********************//

/**
 * Handle the left mouse down event mixed with the ctrl event. Get the specified datas from the movement of
 * the mouse along both x and y axis. Init the rotate value to the position of the mouse during the event.
 * @param event : the mouse down event mixed with the ctrl down event.
 */
PlanarCameraControls.prototype.handleMouseDownRotate = function handleMouseDownRotate(event) {
    rotateStart.set(event.clientX, event.clientY);
};

/**
 * Handle the left mouse down event. Get the specified datas from the movement of the mouse along both x and y axis.
 * Init the pan value to the position of the mouse during the event.
 * @param event : the mouse down event.
 */
PlanarCameraControls.prototype.handleMouseDownPan = function handleMouseDownPan(event) {
    panStart.set(event.clientX, event.clientY);
};

/**
 * Handle the left mouse down event. Get the specified datas from the movement of the mouse along both x and y axis.
 * Init the dolly value to the position of the mouse during the event.
 * @param event : the mouse down event.
 */
PlanarCameraControls.prototype.handleMouseDownDolly = function handleMouseDownDolly(event) {
    dollyStart.set(event.clientX, event.clientY);
};

/**
 * Handle the mouse wheel actionned event. Get the specified data from the movement of the wheel. compute the scale
 * (zoom) value and update the camera controls.
 * @param event : the mouse wheel event.
 */
PlanarCameraControls.prototype.handleMouseWheel = function handleMouseWheel(event) {
    var delta = 0;

    if (event.wheelDelta !== undefined) {
        delta = event.wheelDelta;
    } else if (event.detail !== undefined) {
        delta = -event.detail;
    }

    if (delta > 0) {
        scale *= scope.zoomSpeed;
    }
    else {
        scale /= scope.zoomSpeed;
    }

    scope.update();
};

/**
 * Handle the mouse move event mixed with the ctrl event. Get the specified datas from the movement of the mouse
 * along both x and y axis. Compute the rotate value and update the camera controls.
 * @param event : the mouse move event mixed with the ctrl down event.
 */
PlanarCameraControls.prototype.handleMouseMoveRotate = function handleMouseMoveRotate(event) {
    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    scope.rotate(rotateDelta.x, rotateDelta.y);

    rotateStart.copy(rotateEnd);

    scope.update();
};

/**
 * Handle the mouse move event. Get the specified datas from the movement of the mouse along both x and y axis.
 * Compute the pan value and update the camera controls.
 * @param event : the mouse move event.
 */
PlanarCameraControls.prototype.handleMouseMovePan = function handleMouseMovePan(event) {
    panEnd.set(event.clientX, event.clientY);
    panDelta.subVectors(panEnd, panStart);

    if (state === STATE.PAN)
        { scope.pan(panDelta.x, panDelta.y); }
    else if (state === STATE.PANUP)
        { scope.panUp(panDelta.y); }

    panStart.copy(panEnd);

    scope.update();
};

PlanarCameraControls.prototype.handlePick = function handlePick(event) {
    var mouse = new THREE.Vector2(
        event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
    scope.engine.selectNodeAt(mouse);
    scope.engine.update();
};

//* *********************Touch**********************//

//* ************************************************************************************//
//* *********************************** Event catchers *********************************//
//* ************************************************************************************//

//* *********************Keys***********************//

/**
 * Catch and manage the event when a key is down.
 * @param event: the current event
 */
PlanarCameraControls.prototype.onKeyDown = function onKeyDown(event) {
    scope.handleKeyDown(event);
    window.addEventListener('keyup', scope.onKeyUp, false);
};

/**
 * Catch and manage the event when a key is up.
 * @param event: the current event
 */
PlanarCameraControls.prototype.onKeyUp = function onKeyUp(event) {
    if (event.keyCode == keys.CTRL) {
        isCtrlDown = false;
        window.removeEventListener('keyup', scope.onKeyUp, false);
    } else if (event.keyCode === keys.S) {
        select = false;
        window.removeEventListener('keyup', scope.onKeyUp, false);
    }
};

//* *********************Mouse**********************//

/**
 * Catch and manage the event when a touch on the mouse is down.
 * @param event: the current event (mouse left button clicked or mouse wheel button actionned)
 */
PlanarCameraControls.prototype.onMouseDown = function onMouseDown(event) {
    // Disable default action of this event
    event.preventDefault();

    if (event.button === mouseButtons.LEFTCLICK) {
        if (select) {
            scope.handlePick(event);
        } else if (isCtrlDown) {
            scope.handleMouseDownRotate(event);
            state = STATE.ROTATE;
        } else {
            scope.handleMouseDownPan(event);
            state = STATE.PAN;
        }
    } else if (event.button === mouseButtons.ZOOM) {
        scope.handleMouseDownDolly(event);
        state = STATE.DOLLY;
    } else if (event.button === mouseButtons.RIGHTCLICK) {
        scope.handleMouseDownPan(event);
        state = STATE.PANUP;
    }

    if (state != STATE.NONE) {
        scope.domElement.addEventListener('mousemove', scope.onMouseMove, false);
        scope.domElement.addEventListener('mouseup', scope.onMouseUp, false);
    }
};

/**
 * Catch the event when a touch on the mouse is uped. Reinit the state of the controller and disable.
 * the listener on the move mouse event.
 * @param event: the current event
 */
PlanarCameraControls.prototype.onMouseUp = function onMouseUp(event) {
    event.preventDefault();

    scope.domElement.removeEventListener('mousemove', scope.onMouseMove, false);
    scope.domElement.removeEventListener('mouseup', scope.onMouseUp, false);

    state = STATE.NONE;
};

/**
 * Catch and manage the event when the mouse wheel is rolled.
 * @param event: the current event
 */
PlanarCameraControls.prototype.onMouseWheel = function onMouseWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    scope.handleMouseWheel(event);
};

/**
 * Catch and manage the event when the mouse is moved, depending of the current state of the controller.
 * Can be called when the state of the controller is different of NONE.
 * @param event: the current event
 */
PlanarCameraControls.prototype.onMouseMove = function onMouseMove(event) {
    event.preventDefault();

    if (state === STATE.ROTATE)
        { scope.handleMouseMoveRotate(event); }
    else if (state === STATE.PAN)
        { scope.handleMouseMovePan(event); }
    else if (state === STATE.PANUP)
        { scope.handleMouseMovePan(event); }
};

export default PlanarCameraControls;
