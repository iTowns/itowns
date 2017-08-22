/** Description: Camera controls adapted for a planar view, with animated movements
* Left mouse button : "drag" the ground, translating the camera on the (xy) world plane.
* Right mouse button : translate the camera on local x and world z axis (pan)
* Ctrl + left mouse : rotate (orbit) around the camera's focus point.
* Scroll wheel : zooms toward cursor position (animated).
* Middle mouse button (wheel click) : 'smart zoom' at cursor location (animated).
* S : go to start view (animated)
* T : go to top view (animated)
* How to use : instanciate PlanarControls after camera setup (setPosition and lookAt)
* or you can also setup the camera with options.startPosition and options.startLook
*/

import * as THREE from 'three';

// event keycode
const keys = {
    CTRL: 17,
    SPACE: 32,
    S: 83,
    T: 84 };

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
    this.position = this.camera.position;

    this.rotateSpeed = options.rotateSpeed || 2.0;

    // minPanSpeed when close to the ground, maxPanSpeed when close to maxAltitude
    this.maxPanSpeed = options.maxPanSpeed || 10;
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

    // max travel duration is reached for this travel distance
    this.autoTravelTimeDist = options.autoTravelTimeDist || 20000;

    // after a smartZoom, camera height above ground will be between these two values
    this.smartZoomHeightMin = options.smartZoomHeightMin || 75;
    this.smartZoomHeightMax = options.smartZoomHeightMax || 500;

    // if set to true, animated travels have 0 duration
    this.instantTravel = options.instantTravel || false;

    this.minZenithAngle = options.minZenithAngle || 0 * Math.PI / 180;

    // should be less than 90 deg (90 = parallel to the ground)
    this.maxZenithAngle = (options.maxZenithAngle || 82.5) * Math.PI / 180;

    // prevent the default contextmenu from appearing when right-clicking
    // this allows to use right-click for input without the menu appearing
    this.domElement.addEventListener('contextmenu', onContextMenu.bind(this), false);

    // add this PlanarControl instance to the view's framerequesters
    // with this, PlanarControl.update() will be called each frame
    this.view.addFrameRequester(this);

    this.state = STATE.NONE;
    this.isCtrlDown = false;

    // mouse movement
    this.mousePosition = new THREE.Vector2();
    this.lastMousePosition = new THREE.Vector2();
    this.deltaMousePosition = new THREE.Vector2(0, 0);

    // drag movement
    this.dragStart = new THREE.Vector3();
    this.dragEnd = new THREE.Vector3();
    this.dragDelta = new THREE.Vector3();

    // camera focus point : ground point at screen center
    this.centerPoint = new THREE.Vector3(0, 0, 0);

    // camera rotation
    this.phi = 0.0;

    // animated travel
    this.travelEndPos = new THREE.Vector3();
    this.travelStartPos = new THREE.Vector3();
    this.travelStartRot = new THREE.Quaternion();
    this.travelEndRot = new THREE.Quaternion();
    this.travelAlpha = 0;
    this.travelDuration = 0;
    this.travelUseRotation = false;
    this.travelUseSmooth = false;

    // time management
    this.deltaTime = 0;
    this.lastElapsedTime = 0;
    this.clock = new THREE.Clock();

    // eventListeners handlers
    this._handlerOnKeyDown = onKeyDown.bind(this);
    this._handlerOnKeyUp = onKeyUp.bind(this);
    this._handlerOnMouseDown = onMouseDown.bind(this);
    this._handlerOnMouseUp = onMouseUp.bind(this);
    this._handlerOnMouseMove = onMouseMove.bind(this);
    this._handlerOnMouseWheel = onMouseWheel.bind(this);

    /**
    * PlanarControl update
    * Updates the view and camera if needed, and handles the animated travel
    */
    this.update = function update() {
        this.deltaTime = this.clock.getElapsedTime() - this.lastElapsedTime;
        this.lastElapsedTime = this.clock.getElapsedTime();

        if (this.state === STATE.TRAVEL) {
            this.handleTravel(this.deltaTime);
        }
        if (this.state !== STATE.NONE) {
            this.view.camera.update(window.innerWidth, window.innerHeight);
            this.view.notifyChange(true);
        }
    };

    /**
    * Initiate a drag movement (translation on xy plane) when user does a left-click
    * The movement value is derived from the actual world point under the mouse cursor
    * This allows the user to 'grab' a world point and drag it to move (eg : google map)
    */
    this.initiateDrag = function initiateDrag() {
        this.state = STATE.DRAG;

        // the world point under mouse cursor when the drag movement is started
        this.dragStart.copy(this.getWorldPointAtScreenXY(this.mousePosition));

        // the difference between start and end cursor position
        this.dragDelta.set(0, 0, 0);
    };

    /**
    * Handle the drag movement (translation on xy plane) when user moves the mouse while in STATE.DRAG
    * The drag movement is previously initiated when user does a left-click, by initiateDrag()
    * Compute the drag value and update the camera controls.
    * The movement value is derived from the actual world point under the mouse cursor
    * This allows the user to 'grab' a world point and drag it to move (eg : google map)
    */
    this.handleDragMovement = function handleDragMovement() {
        // the world point under the current mouse cursor position, at same altitude than dragStart
        this.dragEnd.copy(this.getWorldPointFromMathPlaneAtScreenXY(this.mousePosition, this.dragStart.z));

        // the difference between start and end cursor position
        this.dragDelta.subVectors(this.dragStart, this.dragEnd);

        // new camera position
        this.position.add(this.dragDelta);

        // request update
        this.update();
    };

    /**
    * Initiate a pan movement (local translation on xz plane) when user does a righ-click
    */
    this.initiatePan = function initiatePan() {
        this.state = STATE.PAN;
    };

    /**
    * Handle the pan movement (translation on local x / world z plane) when user moves the mouse while in STATE.PAN
    * The drag movement is previously initiated when user does a right-click, by initiatePan()
    * Compute the pan value and update the camera controls.
    */
    this.handlePanMovement = function handlePanMovement() {
        // normalized (betwwen 0 and 1) distance between groundLevel and maxAltitude
        const distToGround = THREE.Math.clamp((this.position.z - this.groundLevel) / this.maxAltitude, 0, 1);

        // pan movement speed, adujsted according to altitude
        const panSpeed = THREE.Math.lerp(this.minPanSpeed, this.maxPanSpeed, distToGround);

        // lateral movement (local x axis)
        this.position.copy(this.camera.localToWorld(new THREE.Vector3(panSpeed * -1 * this.deltaMousePosition.x, 0, 0)));

        // vertical movement (world z axis)
        const newAltitude = this.position.z + panSpeed * this.deltaMousePosition.y;

        // check if altitude is valid
        if (newAltitude < this.maxAltitude && newAltitude > this.groundLevel) {
            this.position.z = newAltitude;
        }

        // request update
        this.update();
    };

    /**
    * Initiate a rotate (orbit) movement when user does a right-click or ctrl + left-click
    */
    this.initiateRotation = function initiateRotation() {
        this.state = STATE.ROTATE;

        const screenCenter = new THREE.Vector2(0.5 * window.innerWidth, 0.5 * window.innerHeight);

        this.centerPoint.copy(this.getWorldPointAtScreenXY(screenCenter));

        const r = this.position.distanceTo(this.centerPoint);
        this.phi = Math.acos((this.position.z - this.centerPoint.z) / r);
    };

    /**
    * Handle the rotate movement (orbit) when user moves the mouse while in STATE.ROTATE
    * the movement is an orbit around 'centerPoint', the camera focus point (ground point at screen center)
    * The rotate movement is previously initiated in initiateRotation()
    * Compute the new position value and update the camera controls.
    */
    this.handleRotation = function handleRotation() {
        // angle deltas
        // deltaMousePosition is computed in onMouseMove / onMouseDown s
        const thetaDelta = -this.rotateSpeed * this.deltaMousePosition.x / window.innerWidth;
        const phiDelta = -this.rotateSpeed * this.deltaMousePosition.y / window.innerHeight;

        // the vector from centerPoint (focus point) to camera position
        const offset = this.position.clone().sub(this.centerPoint);

        const quat = new THREE.Quaternion().setFromUnitVectors(this.camera.up, new THREE.Vector3(0, 0, 1));
        const quatInverse = quat.clone().inverse();

        if (thetaDelta !== 0 || phiDelta !== 0) {
            if ((this.phi + phiDelta >= this.minZenithAngle)
            && (this.phi + phiDelta <= this.maxZenithAngle)
            && phiDelta !== 0) {
                // rotation around X (altitude)
                this.phi += phiDelta;
                offset.applyQuaternion(quat);

                const rotationXQuaternion = new THREE.Quaternion();
                const vector = new THREE.Vector3();

                vector.setFromMatrixColumn(this.camera.matrix, 0);
                rotationXQuaternion.setFromAxisAngle(vector, phiDelta);
                offset.applyQuaternion(rotationXQuaternion);
                offset.applyQuaternion(quatInverse);
            }
            if (thetaDelta !== 0) {
                // rotation around Z (azimuth)

                const rotationZQuaternion = new THREE.Quaternion();
                rotationZQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), thetaDelta);
                offset.applyQuaternion(rotationZQuaternion);
            }
        }

        this.position.copy(offset).add(this.centerPoint);

        this.camera.lookAt(this.centerPoint);

        this.update();
    };

    /**
    * Triggers a Zoom animated movement (travel) toward / away from the world point under the mouse cursor
    * The zoom intensity varies according to the distance between the camera and the point.
    * The closer to the ground, the lower the intensity
    * Orientation will not change ('none' parameter in the call to initiateTravel function)
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

        const pointUnderCursor = this.getWorldPointAtScreenXY(this.mousePosition);
        const newPos = new THREE.Vector3();

        // Zoom IN
        if (delta > 0) {
            // target position
            newPos.lerpVectors(this.position, pointUnderCursor, this.zoomInFactor);
            // initiate travel
            this.initiateTravel(newPos, this.zoomTravelTime, 'none', false);
        }
        // Zoom OUT
        else if (delta < 0 && this.position.z < this.maxAltitude) {
            // target position
            newPos.lerpVectors(this.position, pointUnderCursor, -1 * this.zoomOutFactor);
            // initiate travel
            this.initiateTravel(newPos, this.zoomTravelTime, 'none', false);
        }
    };

    /**
    * Triggers a 'smart zoom' animated movement (travel) toward the point under mouse cursor
    * The camera will be smoothly moved and oriented close to the target, at a determined height and distance
    */
    this.initiateSmartZoom = function initiateSmartZoom() {
        // point under mouse cursor
        const pointUnderCursor = this.getWorldPointAtScreenXY(this.mousePosition);

        // direction of the movement, projected on xy plane and normalized
        const dir = new THREE.Vector3();
        dir.copy(pointUnderCursor).sub(this.position);
        dir.z = 0;
        dir.normalize();

        const distanceToPoint = this.position.distanceTo(pointUnderCursor);

        // camera height (altitude above ground) at the end of the travel
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
    * if targetOrientation is 'none' : the camera will keep its starting orientation
    * if targetOrientation is a world point (Vector3) : the camera will lookAt() this point
    * if targetOrientation is a quaternion : this quaternion will define the final camera orientation
    * @param {boolean} useSmooth : animation is smoothed using the 'smooth(value)' function (slower at start and finish)
    */
    this.initiateTravel = function initiateTravel(targetPos, travelTime, targetOrientation, useSmooth) {
        this.state = STATE.TRAVEL;

        // update cursor
        this.updateMouseCursorType();

        this.travelUseRotation = !(targetOrientation === 'none');
        this.travelUseSmooth = useSmooth;

        // start position (current camera position)
        this.travelStartPos.copy(this.position);

        // start rotation (current camera rotation)
        this.travelStartRot.copy(this.camera.quaternion);

        // setup the end rotation :

        // case where targetOrientation is a quaternion
        if (typeof targetOrientation.w !== 'undefined') {
            this.travelEndRot.copy(targetOrientation);
        }
        // case where targetOrientation is a vector3
        else if (targetOrientation.isVector3) {
            if (targetPos === targetOrientation) {
                this.camera.lookAt(targetOrientation);
                this.travelEndRot.copy(this.camera.quaternion);
                this.camera.quaternion.copy(this.travelStartRot);
            }
            else {
                this.position.copy(targetPos);
                this.camera.lookAt(targetOrientation);
                this.travelEndRot.copy(this.camera.quaternion);
                this.camera.quaternion.copy(this.travelStartRot);
                this.position.copy(this.travelStartPos);
            }
        }

        // end position
        this.travelEndPos.copy(targetPos);

        // beginning of the travel duration setup ===

        if (this.instantTravel) {
            this.travelDuration = 0;
        }

        // case where travelTime is set to 'auto' : travelDuration will be a value between autoTravelTimeMin and autoTravelTimeMax
        // depending on travel distance and travel angular difference
        else if (travelTime === 'auto') {
            // a value between 0 and 1 according to the travel distance. Adjusted by autoTravelTimeDist parameter
            const normalizedDistance = Math.min(1, targetPos.distanceTo(this.position) / this.autoTravelTimeDist);

            this.travelDuration = THREE.Math.lerp(this.autoTravelTimeMin, this.autoTravelTimeMax, normalizedDistance);

            // if travel changes camera orientation, travel duration is adjusted according to angularDifference
            // this allows for a smoother travel (more time for the camera to rotate)
            // final duration will not excede autoTravelTimeMax
            if (this.travelUseRotation) {
                // value is normalized between 0 and 1
                const angularDifference = 0.5 - 0.5 * (this.travelEndRot.normalize().dot(this.camera.quaternion.normalize()));

                this.travelDuration *= 1 + 2 * angularDifference;
                this.travelDuration = Math.min(this.travelDuration, this.autoTravelTimeMax);
            }
        }
        // case where traveltime !== 'auto' : travelTime is a duration in seconds given as parameter
        else {
            this.travelDuration = travelTime;
        }
        // end of travel duration setup ===

        // the progress of the travel (animation alpha)
        this.travelAlpha = 0;

        this.update();
    };

    /** =
    * Resume normal behavior after a travel is completed
    */
    this.endTravel = function endTravel() {
        this.position.copy(this.travelEndPos);

        if (this.travelUseRotation) {
            this.camera.quaternion.copy(this.travelEndRot);
        }

        this.state = STATE.NONE;

        this.updateMouseCursorType();

        this.update();
    };

    /**
    * Handle the animated movement and rotation of the camera in 'travel' state
    * @param {number} dt : the deltatime between two updates
    */
    this.handleTravel = function handleTravel(dt) {
        this.travelAlpha += dt / this.travelDuration;

        // the animation alpha, between 0 (start) and 1 (finish)
        const alpha = (this.travelUseSmooth) ? smooth(this.travelAlpha) : this.travelAlpha;

        // new position
        this.position.lerpVectors(this.travelStartPos, this.travelEndPos, alpha);

        // new rotation
        if (this.travelUseRotation === true) {
            THREE.Quaternion.slerp(this.travelStartRot, this.travelEndRot, this.camera.quaternion, alpha);
        }
        // completion test
        if (this.travelAlpha > 1) {
            this.endTravel();
        }
    };

    /**
    * Triggers an animated movement (travel) to set the camera to top view, above the focus point, at altitude=distanceToFocusPoint
    */
    this.goToTopView = function goToTopView() {
        const topViewPos = new THREE.Vector3();
        const targetQuat = new THREE.Quaternion();
        const screenCenter = new THREE.Vector2(0.5 * window.innerWidth, 0.5 * window.innerHeight);

        topViewPos.copy(this.getWorldPointAtScreenXY(screenCenter));
        topViewPos.z += Math.min(this.maxAltitude, this.position.distanceTo(topViewPos));

        targetQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);

        // initiate the travel
        this.initiateTravel(topViewPos, 'auto', targetQuat, true);
    };

    /**
    * Triggers an animated movement (travel) to set the camera to starting view
    */
    this.goToStartView = function goToStartView() {
        this.initiateTravel(this.startPosition, 'auto', this.startLook, true);
    };

    /**
    * returns the world point (xyz) under the posXY screen point
    * the point belong to an abstract mathematical plane of specified altitude (doesnt use actual geometry)
    * @param {THREE.Vector2} posXY : the mouse position in screen space (unit : pixel)
    * @param {number} altitude : the altitude (z) of the mathematical plane
    * @returns {THREE.Vector3}
    */
    this.getWorldPointFromMathPlaneAtScreenXY = function getWorldPointFromMathPlaneAtScreenXY(posXY, altitude) {
        const vector = new THREE.Vector3();
        vector.set((posXY.x / window.innerWidth) * 2 - 1, -(posXY.y / window.innerHeight) * 2 + 1, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.position).normalize();
        const distance = (altitude - this.position.z) / dir.z;
        const pointUnderCursor = this.position.clone().add(dir.multiplyScalar(distance));

        return pointUnderCursor;
    };

    /**
    * returns the world point (xyz) under the posXY screen point
    * if geometry is under the cursor, the point in obtained with getPickingPositionFromDepth
    * if no geometry is under the cursor, the point is obtained with getWorldPointFromMathPlaneAtScreenXY
    * @param {THREE.Vector2} posXY : the mouse position in screen space (unit : pixel)
    * @returns {THREE.Vector3}
    */
    this.getWorldPointAtScreenXY = function getWorldPointAtScreenXY(posXY) {
        // the returned value
        const pointUnderCursor = new THREE.Vector3();

        // check if there is valid geometry under cursor
        if (typeof this.view.getPickingPositionFromDepth(posXY) !== 'undefined') {
            pointUnderCursor.copy(this.view.getPickingPositionFromDepth(posXY));
        }
        // if not, we use the mathematical plane at altitude = groundLevel
        else {
            pointUnderCursor.copy(this.getWorldPointFromMathPlaneAtScreenXY(posXY, this.groundLevel));
        }
        return pointUnderCursor;
    };

    /**
    * Adds all the input event listeners (activate the controls)
    */
    this.addInputListeners = function addInputListeners() {
        window.addEventListener('keydown', this._handlerOnKeyDown, true);
        window.addEventListener('keyup', this._handlerOnKeyUp, true);
        this.domElement.addEventListener('mousedown', this._handlerOnMouseDown, false);
        this.domElement.addEventListener('mouseup', this._handlerOnMouseUp, false);
        this.domElement.addEventListener('mousemove', this._handlerOnMouseMove, false);
        this.domElement.addEventListener('mousewheel', this._handlerOnMouseWheel, false);
        // For firefox
        this.domElement.addEventListener('MozMousePixelScroll', this._handlerOnMouseWheel, false);
    };

    /**
    * removes all the input event listeners (desactivate the controls)
    */
    this.removeInputListeners = function removeInputListeners() {
        window.removeEventListener('keydown', this._handlerOnKeyDown, true);
        window.removeEventListener('keyup', this._handlerOnKeyUp, true);
        this.domElement.removeEventListener('mousedown', this._handlerOnMouseDown, false);
        this.domElement.removeEventListener('mouseup', this._handlerOnMouseUp, false);
        this.domElement.removeEventListener('mousemove', this._handlerOnMouseMove, false);
        this.domElement.removeEventListener('mousewheel', this._handlerOnMouseWheel, false);
        // For firefox
        this.domElement.removeEventListener('MozMousePixelScroll', this._handlerOnMouseWheel, false);
    };

    /**
    * update the cursor image according to the control state
    */
    this.updateMouseCursorType = function updateMouseCursorType() {
        if (this.state === STATE.NONE) {
            this.domElement.style.cursor = 'auto';
        }
        else if (this.state === STATE.DRAG) {
            this.domElement.style.cursor = 'move';
        }
        else if (this.state === STATE.PAN) {
            this.domElement.style.cursor = 'cell';
        }
        else if (this.state === STATE.TRAVEL) {
            this.domElement.style.cursor = 'wait';
        }
        else if (this.state === STATE.ROTATE) {
            this.domElement.style.cursor = 'move';
        }
    };

    PlanarControls.prototype = Object.create(THREE.EventDispatcher.prototype);
    PlanarControls.prototype.constructor = PlanarControls;

    // starting position and lookAt target can be set outside this class, before instanciating PlanarControls
    // or they can be set with options : startPosition and startLookAt
    this.startPosition = options.startPosition || this.position.clone();
    this.startLook = options.startLook || this.camera.quaternion.clone();

    this.position.copy(this.startPosition);
    this.camera.quaternion.copy(this.startLook);

    // event listeners for user input
    this.addInputListeners();
}

/**
* Catch and manage the event when a touch on the mouse is down.
* @param {event} event : the current event (mouse left button clicked or mouse wheel button actionned)
*/
var onMouseDown = function onMouseDown(event) {
    event.preventDefault();

    this.mousePosition.set(event.clientX, event.clientY);

    if (this.state === STATE.TRAVEL) {
        return;
    }

    this.lastMousePosition.copy(this.mousePosition);

    if (event.button === mouseButtons.LEFTCLICK) {
        if (this.isCtrlDown) {
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
};

/**
* Catch the event when a touch on the mouse is uped. Reinit the state of the controller and disable.
* the listener on the move mouse event.
* @param {event} event : the current event
*/
var onMouseUp = function onMouseUp(event) {
    event.preventDefault();

    this.dragDelta.set(0, 0, 0);

    if (this.state !== STATE.TRAVEL) {
        this.state = STATE.NONE;
    }

    this.updateMouseCursorType();
};

/**
* Catch and manage the event when the mouse is moved
* @param {event} event : the current event
*/
var onMouseMove = function onMouseMove(event) {
    event.preventDefault();

    this.mousePosition.set(event.clientX, event.clientY);

    this.deltaMousePosition.copy(this.mousePosition).sub(this.lastMousePosition);

    this.lastMousePosition.copy(this.mousePosition);

    if (this.state === STATE.ROTATE)
    { this.handleRotation(); }
    else if (this.state === STATE.DRAG)
    { this.handleDragMovement(); }
    else if (this.state === STATE.PAN)
    { this.handlePanMovement(); }
};

/**
* Catch and manage the event when a key is up.
* @param {event} event : the current event
*/
var onKeyUp = function onKeyUp(event) {
    if (event.keyCode === keys.CTRL) {
        this.isCtrlDown = false;
    }
};

/**
* Catch and manage the event when a key is down.
* @param {event} event : the current event
*/
var onKeyDown = function onKeyDown(event) {
    if (this.state === STATE.TRAVEL) {
        return;
    }
    if (event.keyCode === keys.T) {
        this.goToTopView();
    }
    if (event.keyCode === keys.S) {
        this.goToStartView();
    }
    if (event.keyCode === keys.SPACE) {
        this.initiateSmartZoom(event);
    }
    if (event.keyCode === keys.CTRL) {
        this.isCtrlDown = true;
    }
};

/**
* Catch and manage the event when the mouse wheel is rolled.
* @param {event} event : the current event
*/
var onMouseWheel = function onMouseWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.state === STATE.NONE) {
        this.initiateZoom(event);
    }
};

/**
* Catch and manage the event when the context menu is called (by a right click on the window).
* We use this to prevent the context menu from appearing, so we can use right click for other inputs.
* @param {event} event : the current event
*/
var onContextMenu = function onContextMenu(event) {
    event.preventDefault();
};


/**
* smoothing function (sigmoid) : based on h01 Hermite function
* returns a value between 0 and 1
* @param {number} value : the value to be smoothed, between 0 and 1
* @returns {number}
*/
var smooth = function smooth(value) {
    // p between 1.0 and 1.5
    return Math.pow((value * value * (3 - 2 * value)), 1.20);
};

export default PlanarControls;
