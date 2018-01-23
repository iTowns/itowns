/** Description: Camera controls adapted for a planar view, with animated movements
* Left mouse button : "drag" the ground, translating the camera on the (xy) world plane.
* Right mouse button : translate the camera on local x and world z axis (pan)
* Ctrl + left mouse : rotate (orbit) around the camera's focus point.
* Scroll wheel : zooms toward cursor position (animated).
* Middle mouse button (wheel click) : 'smart zoom' at cursor location (animated).
* Y : go to start view (animated)
* T : go to top view (animated)
* How to use : instanciate PlanarControls after camera setup (setPosition and lookAt)
*/

import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from '../../Core/MainLoop';

// event keycode
const keys = {
    CTRL: 17,
    SPACE: 32,
    T: 84,
    Y: 89,
};

const mouseButtons = {
    LEFTCLICK: THREE.MOUSE.LEFT,
    MIDDLECLICK: THREE.MOUSE.MIDDLE,
    RIGHTCLICK: THREE.MOUSE.RIGHT,
};

// control state
const STATE = {
    NONE: -1,
    DRAG: 0,
    PAN: 1,
    ROTATE: 2,
    TRAVEL: 3,
};

/**
* PlanarControls Constructor
* Numerical values have been adjusted for the example provided in examples/planar.html
* Most of them can be changed with the options parameter
* @param {PlanarView} view : the itowns view (planar view)
* @param {options} options : optional parameters.
*/
function PlanarControls(view, options = {}) {
    this.view = view;
    this.camera = view.camera.camera3D;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;

    this.rotateSpeed = options.rotateSpeed || 2.0;

    // minPanSpeed when close to the ground, maxPanSpeed when close to maxAltitude
    this.maxPanSpeed = options.maxPanSpeed || 15;
    this.minPanSpeed = options.minPanSpeed || 0.05;

    // animation duration for the zoom
    this.zoomTravelTime = options.zoomTravelTime || 0.2;

    // zoom movement is equal to the distance to the zoom target, multiplied by zoomFactor
    this.zoomInFactor = options.zoomInFactor || 0.25;
    this.zoomOutFactor = options.zoomOutFactor || 0.4;

    // pan movement is clamped between maxAltitude and groundLevel
    this.maxAltitude = options.maxAltitude || 12000;

    // approximate ground altitude value
    this.groundLevel = options.groundLevel || 200;

    // min and max duration in seconds, for animated travels with 'auto' parameter
    this.autoTravelTimeMin = options.autoTravelTimeMin || 1.5;
    this.autoTravelTimeMax = options.autoTravelTimeMax || 4;

    // max travel duration is reached for this travel distance (empirical smoothing value)
    this.autoTravelTimeDist = options.autoTravelTimeDist || 20000;

    // after a smartZoom, camera height above ground will be between these two values
    this.smartZoomHeightMin = options.smartZoomHeightMin || 75;
    this.smartZoomHeightMax = options.smartZoomHeightMax || 500;

    // if set to true, animated travels have 0 duration
    this.instantTravel = options.instantTravel || false;

    this.minZenithAngle = options.minZenithAngle || 0 * Math.PI / 180;

    // should be less than 90 deg (90 = parallel to the ground)
    this.maxZenithAngle = (options.maxZenithAngle || 82.5) * Math.PI / 180;

    // focus policy options
    this.focusOnMouseOver = options.focusOnMouseOver || true;
    this.focusOnMouseClick = options.focusOnMouseClick || true;

    // Set collision options
    this.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
    this.minDistanceCollision = 30;

    // starting camera position and orientation target are setup before instanciating PlanarControls
    // using: view.camera.setPosition() and view.camera.lookAt()
    // startPosition and startQuaternion are stored to be able to return to the start view
    const startPosition = this.camera.position.clone();
    const startQuaternion = this.camera.quaternion.clone();

    // control state
    this.state = STATE.NONE;

    // mouse movement
    const mousePosition = new THREE.Vector2();
    const lastMousePosition = new THREE.Vector2();
    const deltaMousePosition = new THREE.Vector2(0, 0);

    // drag movement
    const dragStart = new THREE.Vector3();
    const dragEnd = new THREE.Vector3();
    const dragDelta = new THREE.Vector3();

    // camera focus point : ground point at screen center
    const centerPoint = new THREE.Vector3(0, 0, 0);

    // camera rotation
    let phi = 0.0;

    // animated travel
    const travelEndPos = new THREE.Vector3();
    const travelStartPos = new THREE.Vector3();
    const travelStartRot = new THREE.Quaternion();
    const travelEndRot = new THREE.Quaternion();
    let travelAlpha = 0;
    let travelDuration = 0;
    let travelUseRotation = false;
    let travelUseSmooth = false;

    // eventListeners handlers
    const _handlerOnKeyDown = onKeyDown.bind(this);
    const _handlerOnMouseDown = onMouseDown.bind(this);
    const _handlerOnMouseUp = onMouseUp.bind(this);
    const _handlerOnMouseMove = onMouseMove.bind(this);
    const _handlerOnMouseWheel = onMouseWheel.bind(this);

    // focus policy
    if (this.focusOnMouseOver) {
        this.domElement.addEventListener('mouseover', () => this.domElement.focus());
    }
    if (this.focusOnClick) {
        this.domElement.addEventListener('click', () => this.domElement.focus());
    }

    // prevent the default contextmenu from appearing when right-clicking
    // this allows to use right-click for input without the menu appearing
    this.domElement.addEventListener('contextmenu', onContextMenu.bind(this), false);

    // Updates the view and camera if needed, and handles the animated travel
    this.update = function update(dt, updateLoopRestarted) {
        // We test if camera collide to geometry layer or too close to ground and ajust it's altitude in case
        if (this.handleCollision) { // We check distance to the ground/surface geometry. (Could be another geometry layer)
            this.view.camera.adjustAltitudeToAvoidCollisionWithLayer(this.view, view.getLayers(layer => layer.type === 'geometry')[0], this.minDistanceCollision);
        }
        // dt will not be relevant when we just started rendering, we consider a 1-frame move in this case
        if (updateLoopRestarted) {
            dt = 16;
        }
        if (this.state === STATE.TRAVEL) {
            this.handleTravel(dt);
            this.view.notifyChange(true);
        }
        if (this.state === STATE.DRAG) {
            this.handleDragMovement();
        }
        if (this.state === STATE.ROTATE) {
            this.handleRotation();
        }
        if (this.state === STATE.PAN) {
            this.handlePanMovement();
        }
        deltaMousePosition.set(0, 0);
    };

    // add this PlanarControl instance to the view's framerequesters
    // with this, PlanarControl.update() will be called each frame
    this.view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, this.update.bind(this));

    /**
    * Initiate a drag movement (translation on xy plane)
    * The movement value is derived from the actual world point under the mouse cursor
    * This allows the user to 'grab' a world point and drag it to move (eg : google map)
    */
    this.initiateDrag = function initiateDrag() {
        this.state = STATE.DRAG;

        // the world point under mouse cursor when the drag movement is started
        dragStart.copy(this.getWorldPointAtScreenXY(mousePosition));

        // the difference between start and end cursor position
        dragDelta.set(0, 0, 0);
    };

    /**
    * Handle the drag movement (translation on xy plane) when user moves the mouse while in STATE.DRAG
    * The drag movement is previously initiated by initiateDrag()
    * Compute the drag value and update the camera controls.
    * The movement value is derived from the actual world point under the mouse cursor
    * This allows the user to 'grab' a world point and drag it to move (eg : google map)
    */
    this.handleDragMovement = function handleDragMovement() {
        // the world point under the current mouse cursor position, at same altitude than dragStart
        dragEnd.copy(this.getWorldPointFromMathPlaneAtScreenXY(mousePosition, dragStart.z));

        // the difference between start and end cursor position
        dragDelta.subVectors(dragStart, dragEnd);

        this.camera.position.add(dragDelta);

        dragDelta.set(0, 0, 0);
    };

    /**
    * Initiate a pan movement (local translation on xz plane)
    */
    this.initiatePan = function initiatePan() {
        this.state = STATE.PAN;
    };

    /**
    * Handle the pan movement (translation on local x / world z plane) when user moves the mouse while in STATE.PAN
    * The drag movement is previously initiated by initiatePan()
    * Compute the pan value and update the camera controls.
    */
    this.handlePanMovement = (() => {
        const vec = new THREE.Vector3();

        return () => {
            // normalized (betwwen 0 and 1) distance between groundLevel and maxAltitude
            const distToGround = THREE.Math.clamp((this.camera.position.z - this.groundLevel) / this.maxAltitude, 0, 1);

            // pan movement speed, adujsted according to altitude
            const panSpeed = THREE.Math.lerp(this.minPanSpeed, this.maxPanSpeed, distToGround);

            // lateral movement (local x axis)
            vec.set(panSpeed * -1 * deltaMousePosition.x, 0, 0);
            this.camera.position.copy(this.camera.localToWorld(vec));

            // vertical movement (world z axis)
            const newAltitude = this.camera.position.z + panSpeed * deltaMousePosition.y;

            // check if altitude is valid
            if (newAltitude < this.maxAltitude && newAltitude > this.groundLevel) {
                this.camera.position.z = newAltitude;
            }
        };
    })();

    /**
    * Initiate a rotate (orbit) movement
    */
    this.initiateRotation = function initiateRotation() {
        this.state = STATE.ROTATE;

        centerPoint.copy(this.getWorldPointAtScreenXY({ x: 0.5 * this.domElement.clientWidth, y: 0.5 * this.domElement.clientHeight }));

        const r = this.camera.position.distanceTo(centerPoint);
        phi = Math.acos((this.camera.position.z - centerPoint.z) / r);
    };

    /**
    * Handle the rotate movement (orbit) when user moves the mouse while in STATE.ROTATE
    * the movement is an orbit around 'centerPoint', the camera focus point (ground point at screen center)
    * The rotate movement is previously initiated in initiateRotation()
    * Compute the new position value and update the camera controls.
    */
    this.handleRotation = (() => {
        const vec = new THREE.Vector3();
        const quat = new THREE.Quaternion();

        return () => {
            // angle deltas
            // deltaMousePosition is computed in onMouseMove / onMouseDown s
            const thetaDelta = -this.rotateSpeed * deltaMousePosition.x / this.domElement.clientWidth;
            const phiDelta = -this.rotateSpeed * deltaMousePosition.y / this.domElement.clientHeight;

            // the vector from centerPoint (focus point) to camera position
            const offset = this.camera.position.clone().sub(centerPoint);

            if (thetaDelta !== 0 || phiDelta !== 0) {
                if ((phi + phiDelta >= this.minZenithAngle)
                && (phi + phiDelta <= this.maxZenithAngle)
                && phiDelta !== 0) {
                    // rotation around X (altitude)
                    phi += phiDelta;

                    vec.set(0, 0, 1);
                    quat.setFromUnitVectors(this.camera.up, vec);
                    offset.applyQuaternion(quat);

                    vec.setFromMatrixColumn(this.camera.matrix, 0);
                    quat.setFromAxisAngle(vec, phiDelta);
                    offset.applyQuaternion(quat);

                    vec.set(0, 0, 1);
                    quat.setFromUnitVectors(this.camera.up, vec).inverse();
                    offset.applyQuaternion(quat);
                }
                if (thetaDelta !== 0) {
                    // rotation around Z (azimuth)
                    vec.set(0, 0, 1);
                    quat.setFromAxisAngle(vec, thetaDelta);
                    offset.applyQuaternion(quat);
                }
            }

            this.camera.position.copy(offset).add(centerPoint);

            this.camera.lookAt(centerPoint);
        };
    })();

    /**
    * Triggers a Zoom animated movement (travel) toward / away from the world point under the mouse cursor
    * The zoom intensity varies according to the distance between the camera and the point.
    * The closer to the ground, the lower the intensity
    * Orientation will not change (null parameter in the call to initiateTravel function)
    * @param {event} event : the mouse wheel event.
    */
    this.initiateZoom = function initiateZoom(event) {
        let delta;

        // mousewheel delta
        if (event.wheelDelta !== undefined) {
            delta = event.wheelDelta;
        } else if (event.detail !== undefined) {
            delta = -event.detail;
        }

        const pointUnderCursor = this.getWorldPointAtScreenXY(mousePosition);
        const newPos = new THREE.Vector3();

        // Zoom IN
        if (delta > 0) {
            // target position
            newPos.lerpVectors(this.camera.position, pointUnderCursor, this.zoomInFactor);
            // initiate travel
            this.initiateTravel(newPos, this.zoomTravelTime, null, false);
        }
        // Zoom OUT
        else if (delta < 0 && this.camera.position.z < this.maxAltitude) {
            // target position
            newPos.lerpVectors(this.camera.position, pointUnderCursor, -1 * this.zoomOutFactor);
            // initiate travel
            this.initiateTravel(newPos, this.zoomTravelTime, null, false);
        }
    };

    /**
    * Triggers a 'smart zoom' animated movement (travel) toward the point under mouse cursor
    * The camera will be smoothly moved and oriented close to the target, at a determined height and distance
    */
    this.initiateSmartZoom = function initiateSmartZoom() {
        // point under mouse cursor
        const pointUnderCursor = new THREE.Vector3();

        // check if there is valid geometry under cursor
        if (typeof this.view.getPickingPositionFromDepth(mousePosition) !== 'undefined') {
            pointUnderCursor.copy(this.view.getPickingPositionFromDepth(mousePosition));
        }
        else {
            return;
        }

        // direction of the movement, projected on xy plane and normalized
        const dir = new THREE.Vector3();
        dir.copy(pointUnderCursor).sub(this.camera.position);
        dir.z = 0;
        dir.normalize();

        const distanceToPoint = this.camera.position.distanceTo(pointUnderCursor);

        // camera height (altitude above ground) at the end of the travel, 5000 is an empirical smoothing distance
        const targetHeight = THREE.Math.lerp(this.smartZoomHeightMin, this.smartZoomHeightMax, Math.min(distanceToPoint / 5000, 1));

        // camera position at the end of the travel
        const moveTarget = new THREE.Vector3();

        moveTarget.copy(pointUnderCursor).add(dir.multiplyScalar(-targetHeight * 2));
        moveTarget.z = pointUnderCursor.z + targetHeight;

        // initiate the travel
        this.initiateTravel(moveTarget, 'auto', pointUnderCursor, true);
    };


    /**
    * Triggers an animated movement & rotation for the camera
    * @param {THREE.Vector3} targetPos : the target position of the camera (reached at the end)
    * @param {number} travelTime : set to 'auto', or set to a duration in seconds.
    * If set to auto : travel time will be set to a duration between autoTravelTimeMin and autoTravelTimeMax
    * according to the distance and the angular difference between start and finish.
    * @param {(string|THREE.Vector3|THREE.Quaternion)} targetOrientation : define the target rotation of the camera
    * if targetOrientation is a world point (Vector3) : the camera will lookAt() this point
    * if targetOrientation is a quaternion : this quaternion will define the final camera orientation
    * if targetOrientation is neither a quaternion nor a world point : the camera will keep its starting orientation
    * @param {boolean} useSmooth : animation is smoothed using the 'smooth(value)' function (slower at start and finish)
    */
    this.initiateTravel = function initiateTravel(targetPos, travelTime, targetOrientation, useSmooth) {
        this.state = STATE.TRAVEL;
        this.view.notifyChange(true);
        // the progress of the travel (animation alpha)
        travelAlpha = 0;
        // update cursor
        this.updateMouseCursorType();

        travelUseRotation = (targetOrientation instanceof THREE.Quaternion || targetOrientation instanceof THREE.Vector3);
        travelUseSmooth = useSmooth;

        // start position (current camera position)
        travelStartPos.copy(this.camera.position);

        // start rotation (current camera rotation)
        travelStartRot.copy(this.camera.quaternion);

        // setup the end rotation :

        // case where targetOrientation is a quaternion
        if (targetOrientation instanceof THREE.Quaternion) {
            travelEndRot.copy(targetOrientation);
        }
        // case where targetOrientation is a vector3
        else if (targetOrientation instanceof THREE.Vector3) {
            if (targetPos === targetOrientation) {
                this.camera.lookAt(targetOrientation);
                travelEndRot.copy(this.camera.quaternion);
                this.camera.quaternion.copy(travelStartRot);
            }
            else {
                this.camera.position.copy(targetPos);
                this.camera.lookAt(targetOrientation);
                travelEndRot.copy(this.camera.quaternion);
                this.camera.quaternion.copy(travelStartRot);
                this.camera.position.copy(travelStartPos);
            }
        }

        // end position
        travelEndPos.copy(targetPos);

        // beginning of the travel duration setup

        if (this.instantTravel) {
            travelDuration = 0;
        }
        // case where travelTime is set to 'auto' : travelDuration will be a value between autoTravelTimeMin and autoTravelTimeMax
        // depending on travel distance and travel angular difference
        else if (travelTime === 'auto') {
            // a value between 0 and 1 according to the travel distance. Adjusted by autoTravelTimeDist parameter
            const normalizedDistance = Math.min(1, targetPos.distanceTo(this.camera.position) / this.autoTravelTimeDist);

            travelDuration = THREE.Math.lerp(this.autoTravelTimeMin, this.autoTravelTimeMax, normalizedDistance);

            // if travel changes camera orientation, travel duration is adjusted according to angularDifference
            // this allows for a smoother travel (more time for the camera to rotate)
            // final duration will not excede autoTravelTimeMax
            if (travelUseRotation) {
                // value is normalized between 0 and 1
                const angularDifference = 0.5 - 0.5 * (travelEndRot.normalize().dot(this.camera.quaternion.normalize()));

                travelDuration *= 1 + 2 * angularDifference;
                travelDuration = Math.min(travelDuration, this.autoTravelTimeMax);
            }
        }
        // case where traveltime !== 'auto' : travelTime is a duration in seconds given as parameter
        else {
            travelDuration = travelTime;
        }
    };

    /**
    * Resume normal behavior after a travel is completed
    */
    this.endTravel = function endTravel() {
        this.camera.position.copy(travelEndPos);

        if (travelUseRotation) {
            this.camera.quaternion.copy(travelEndRot);
        }

        this.state = STATE.NONE;

        this.updateMouseCursorType();
    };

    /**
    * Handle the animated movement and rotation of the camera in 'travel' state
    * @param {number} dt : the deltatime between two updates in milliseconds
    */
    this.handleTravel = function handleTravel(dt) {
        travelAlpha += (dt / 1000) / travelDuration;

        // the animation alpha, between 0 (start) and 1 (finish)
        const alpha = (travelUseSmooth) ? smooth(travelAlpha) : travelAlpha;

        // new position
        this.camera.position.lerpVectors(travelStartPos, travelEndPos, alpha);

        // new rotation
        if (travelUseRotation === true) {
            THREE.Quaternion.slerp(travelStartRot, travelEndRot, this.camera.quaternion, alpha);
        }
        // completion test
        if (travelAlpha > 1) {
            this.endTravel();
        }
    };

    /**
    * Triggers an animated movement (travel) to set the camera to top view, above the focus point, at altitude=distanceToFocusPoint
    */
    this.goToTopView = function goToTopView() {
        const topViewPos = new THREE.Vector3();
        const targetQuat = new THREE.Quaternion();

        // the top view position is above the camera focus point, at an altitude = distanceToPoint
        topViewPos.copy(this.getWorldPointAtScreenXY({ x: 0.5 * this.domElement.clientWidth, y: 0.5 * this.domElement.clientHeight }));
        topViewPos.z += Math.min(this.maxAltitude, this.camera.position.distanceTo(topViewPos));

        targetQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);

        // initiate the travel
        this.initiateTravel(topViewPos, 'auto', targetQuat, true);
    };

    /**
    * Triggers an animated movement (travel) to set the camera to starting view
    */
    this.goToStartView = function goToStartView() {
        this.initiateTravel(startPosition, 'auto', startQuaternion, true);
    };

    /**
    * returns the world point (xyz) under the posXY screen point
    * the point belong to an abstract mathematical plane of specified altitude (doesnt use actual geometry)
    * @param {THREE.Vector2} posXY : the mouse position in screen space (unit : pixel)
    * @param {number} altitude : the altitude (z) of the mathematical plane
    * @returns {THREE.Vector3}
    */
    this.getWorldPointFromMathPlaneAtScreenXY = (() => {
        const vector = new THREE.Vector3();
        return (posXY, altitude) => {
            vector.set((posXY.x / this.domElement.clientWidth) * 2 - 1, -(posXY.y / this.domElement.clientHeight) * 2 + 1, 0.5);
            vector.unproject(this.camera);
            // dir = direction toward the point on the plane
            const dir = vector.sub(this.camera.position).normalize();
            // distance from camera to point on the plane
            const distance = (altitude - this.camera.position.z) / dir.z;

            return this.camera.position.clone().add(dir.multiplyScalar(distance));
        };
    })();

    /**
    * returns the world point (xyz) under the posXY screen point
    * if geometry is under the cursor, the point in obtained with getPickingPositionFromDepth
    * if no geometry is under the cursor, the point is obtained with getWorldPointFromMathPlaneAtScreenXY
    * @param {THREE.Vector2} posXY : the mouse position in screen space (unit : pixel)
    * @returns {THREE.Vector3}
    */
    this.getWorldPointAtScreenXY = function getWorldPointAtScreenXY(posXY) {
        const pointUnderCursor = this.view.getPickingPositionFromDepth(posXY);
        // check if there is valid geometry under cursor
        if (pointUnderCursor) {
            return pointUnderCursor;
        }
        // if not, we use the mathematical plane at altitude = groundLevel
        else {
            return this.getWorldPointFromMathPlaneAtScreenXY(posXY, this.groundLevel);
        }
    };

    this.updateMousePositionAndDelta = function updateMousePositionAndDelta(event) {
        mousePosition.set(event.clientX, event.clientY);

        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);

        lastMousePosition.copy(mousePosition);
    };

    /**
    * Adds all the input event listeners (activate the controls)
    */
    this.addInputListeners = function addInputListeners() {
        this.domElement.addEventListener('keydown', _handlerOnKeyDown, true);
        this.domElement.addEventListener('mousedown', _handlerOnMouseDown, false);
        this.domElement.addEventListener('mouseup', _handlerOnMouseUp, false);
        this.domElement.addEventListener('mousemove', _handlerOnMouseMove, false);
        this.domElement.addEventListener('mousewheel', _handlerOnMouseWheel, false);
        // For firefox
        this.domElement.addEventListener('MozMousePixelScroll', _handlerOnMouseWheel, false);
    };

    /**
    * removes all the input event listeners (desactivate the controls)
    */
    this.removeInputListeners = function removeInputListeners() {
        this.domElement.removeEventListener('keydown', _handlerOnKeyDown, true);
        this.domElement.removeEventListener('mousedown', _handlerOnMouseDown, false);
        this.domElement.removeEventListener('mouseup', _handlerOnMouseUp, false);
        this.domElement.removeEventListener('mousemove', _handlerOnMouseMove, false);
        this.domElement.removeEventListener('mousewheel', _handlerOnMouseWheel, false);
        // For firefox
        this.domElement.removeEventListener('MozMousePixelScroll', _handlerOnMouseWheel, false);
    };

    /**
    * update the cursor image according to the control state
    */
    this.updateMouseCursorType = function updateMouseCursorType() {
        switch (this.state) {
            case STATE.NONE:
                this.domElement.style.cursor = 'auto';
                break;
            case STATE.DRAG:
                this.domElement.style.cursor = 'move';
                break;
            case STATE.PAN:
                this.domElement.style.cursor = 'cell';
                break;
            case STATE.TRAVEL:
                this.domElement.style.cursor = 'wait';
                break;
            case STATE.ROTATE:
                this.domElement.style.cursor = 'move';
                break;
            default:
                break;
        }
    };

    // event listeners for user input (to activate the controls)
    this.addInputListeners();
}
// ===== end of PlanarControls constructor =====

/**
* Catch and manage the event when a touch on the mouse is down.
* @param {event} event : the current event (mouse left button clicked or mouse wheel button actionned)
*/
function onMouseDown(event) {
    event.preventDefault();

    if (this.state === STATE.TRAVEL) {
        return;
    }

    this.updateMousePositionAndDelta(event);

    if (event.button === mouseButtons.LEFTCLICK) {
        if (event.ctrlKey) {
            this.initiateRotation();
        } else {
            this.initiateDrag();
        }
    } else if (event.button === mouseButtons.MIDDLECLICK) {
        this.initiateSmartZoom(event);
    } else if (event.button === mouseButtons.RIGHTCLICK) {
        this.initiatePan();
    }

    this.updateMouseCursorType();
}

/**
* Catch the event when a touch on the mouse is uped.
* @param {event} event : the current event
*/
function onMouseUp(event) {
    event.preventDefault();

    if (this.state !== STATE.TRAVEL) {
        this.state = STATE.NONE;
    }

    this.updateMouseCursorType();
}

/**
* Catch and manage the event when the mouse is moved
* @param {event} event : the current event
*/
function onMouseMove(event) {
    event.preventDefault();

    this.updateMousePositionAndDelta(event);

    // notify change if moving
    if (this.state !== STATE.NONE) {
        this.view.notifyChange(true);
    }
}

/**
* Catch and manage the event when a key is down.
* @param {event} event : the current event
*/
function onKeyDown(event) {
    if (this.state === STATE.TRAVEL) {
        return;
    }
    if (event.keyCode === keys.T) {
        this.goToTopView();
    }
    if (event.keyCode === keys.Y) {
        this.goToStartView();
    }
    if (event.keyCode === keys.SPACE) {
        this.initiateSmartZoom(event);
    }
}

/**
* Catch and manage the event when the mouse wheel is rolled.
* @param {event} event : the current event
*/
function onMouseWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.state === STATE.NONE) {
        this.initiateZoom(event);
    }
}

/**
* Catch and manage the event when the context menu is called (by a right click on the window).
* We use this to prevent the context menu from appearing, so we can use right click for other inputs.
* @param {event} event : the current event
*/
function onContextMenu(event) {
    event.preventDefault();
}

/**
* smoothing function (sigmoid) : based on h01 Hermite function
* returns a value between 0 and 1
* @param {number} value : the value to be smoothed, between 0 and 1
* @returns {number}
*/
function smooth(value) {
    // p between 1.0 and 1.5 (empirical)
    const p = 1.20;
    return Math.pow((value * value * (3 - 2 * value)), p);
}

export default PlanarControls;
