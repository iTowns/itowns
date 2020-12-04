import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';

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

// starting camera position and orientation target
const startPosition = new THREE.Vector3();
const startQuaternion = new THREE.Quaternion();

// point under the cursor
const pointUnderCursor = new THREE.Vector3();

// control state
const STATE = {
    NONE: -1,
    DRAG: 0,
    PAN: 1,
    ROTATE: 2,
    TRAVEL: 3,
};

const vectorZero = new THREE.Vector3();

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

// displacement and rotation vectors
const vect = new THREE.Vector3();
const quat = new THREE.Quaternion();

// animated travel
const travelEndPos = new THREE.Vector3();
const travelStartPos = new THREE.Vector3();
const travelStartRot = new THREE.Quaternion();
const travelEndRot = new THREE.Quaternion();
let travelAlpha = 0;
let travelDuration = 0;
let travelUseRotation = false;
let travelUseSmooth = false;

// default parameters :
const defaultOptions = {
    enableRotation: true,
    rotateSpeed: 2.0,
    minPanSpeed: 0.05,
    maxPanSpeed: 15,
    zoomTravelTime: 0.2,
    zoomInFactor: 0.25,
    zoomOutFactor: 0.4,
    maxAltitude: 12000,
    groundLevel: 200,
    autoTravelTimeMin: 1.5,
    autoTravelTimeMax: 4,
    autoTravelTimeDist: 20000,
    smartZoomHeightMin: 75,
    smartZoomHeightMax: 500,
    instantTravel: false,
    minZenithAngle: 0,
    maxZenithAngle: 82.5,
    focusOnMouseOver: true,
    focusOnMouseClick: true,
    handleCollision: true,
    minDistanceCollision: 30,
    enableSmartTravel: true,
};

export const PLANAR_CONTROL_EVENT = {
    MOVED: 'moved',
};

/**
 * Planar controls is a camera controller adapted for a planar view, with animated movements.
 * Usage is as follow :
 * <ul>
 *     <li><b>Left mouse button:</b> drag the camera (translation on the (xy) world plane).</li>
 *     <li><b>Right mouse button:</b> pan the camera (translation on the vertical (z) axis of the world plane).</li>
 *     <li><b>CTRL + Left mouse button:</b> rotate the camera around the focus point.</li>
 *     <li><b>Wheel scrolling:</b> zoom toward the cursor position.</li>
 *     <li><b>Wheel clicking:</b> smart zoom toward the cursor position (animated).</li>
 *     <li><b>Y key:</b> go to the starting view (animated).</li>
 *     <li><b>T key:</b> go to the top view (animated).</li>
 * </ul>
 *
 * @class   PlanarControls
 * @param   {PlanarView}    view                                the view where the controls will be used
 * @param   {object}        options
 * @param   {boolean}       [options.enableRotation=true]       Enable the rotation with the `CTRL + Left mouse button`
 * and in animations, like the smart zoom.
 * @param   {number}        [options.rotateSpeed=2.0]           Rotate speed.
 * @param   {number}        [options.maxPanSpeed=15]            Pan speed when close to maxAltitude.
 * @param   {number}        [options.minPanSpeed=0.05]          Pan speed when close to the ground.
 * @param   {number}        [options.zoomTravelTime=0.2]        Animation time when zooming.
 * @param   {number}        [options.zoomInFactor=0.025]        Zoom movement is equal to the distance to the zoom
 * target, multiplied by this factor when zooming in.
 * @param   {number}        [options.zoomOutFactor=0.4]         Zoom movement is equal to the distance to the zoom
 * target, multiplied by this factor when zooming out.
 * @param   {number}        [options.maxAltitude=12000]         Maximum altitude reachable when panning.
 * @param   {number}        [options.groundLevel=200]           Minimum altitude reachable when panning.
 * @param   {number}        [options.autoTravelTimeMin=1.5]     Minimum duration for animated travels with the `auto`
 * parameter.
 * @param   {number}        [options.autoTravelTimeMax=4]       Maximum duration for animated travels with the `auto`
 * parameter.
 * @param   {number}        [options.autoTravelTimeDist=20000]  Maximum travel distance for animated travel with the
 * `auto` parameter.
 * @param   {number}        [options.smartZoomHeightMin=75]     Minimum height above ground reachable after a smart
 * zoom.
 * @param   {number}        [options.smartZoomHeightMax=500]    Maximum height above ground reachable after a smart
 * zoom.
 * @param   {boolean}       [options.instantTravel=false]       If set to true, animated travels will have no duration.
 * @param   {number}        [options.minZenithAngle=0]          The minimum reachable zenith angle for a camera
 * rotation, in degrees.
 * @param   {number}        [options.maxZenithAngle=82.5]       The maximum reachable zenith angle for a camera
 * rotation, in degrees.
 * @param   {boolean}       [options.focusOnMouseOver=true]     Set the focus on the canvas if hovered.
 * @param   {boolean}       [options.focusOnMouseClick=true]    Set the focus on the canvas if clicked.
 * @param   {boolean}       [options.handleCollision=true]
 * @param   {boolean}       [options.enableSmartTravel=true]    enable smart travel
 */
class PlanarControls extends THREE.EventDispatcher {
    constructor(view, options = {}) {
        super();
        this.view = view;
        this.camera = view.camera.camera3D;

        this.enableRotation = options.enableRotation === undefined ?
            defaultOptions.enableRotation : options.enableRotation;
        this.rotateSpeed = options.rotateSpeed || defaultOptions.rotateSpeed;

        // minPanSpeed when close to the ground, maxPanSpeed when close to maxAltitude
        this.minPanSpeed = options.minPanSpeed || defaultOptions.minPanSpeed;
        this.maxPanSpeed = options.maxPanSpeed || defaultOptions.maxPanSpeed;

        // animation duration for the zoom
        this.zoomTravelTime = options.zoomTravelTime || defaultOptions.zoomTravelTime;

        // zoom movement is equal to the distance to the zoom target, multiplied by zoomFactor
        this.zoomInFactor = options.zoomInFactor || defaultOptions.zoomInFactor;
        this.zoomOutFactor = options.zoomOutFactor || defaultOptions.zoomOutFactor;

        // pan movement is clamped between maxAltitude and groundLevel
        this.maxAltitude = options.maxAltitude || defaultOptions.maxAltitude;

        // approximate ground altitude value
        this.groundLevel = options.groundLevel || defaultOptions.groundLevel;

        // min and max duration in seconds, for animated travels with `auto` parameter
        this.autoTravelTimeMin = options.autoTravelTimeMin || defaultOptions.autoTravelTimeMin;
        this.autoTravelTimeMax = options.autoTravelTimeMax || defaultOptions.autoTravelTimeMax;

        // max travel duration is reached for this travel distance (empirical smoothing value)
        this.autoTravelTimeDist = options.autoTravelTimeDist || defaultOptions.autoTravelTimeDist;

        // after a smartZoom, camera height above ground will be between these two values
        this.smartZoomHeightMin = options.smartZoomHeightMin || defaultOptions.smartZoomHeightMin;
        this.smartZoomHeightMax = options.smartZoomHeightMax || defaultOptions.smartZoomHeightMax;

        // if set to true, animated travels have 0 duration
        this.instantTravel = options.instantTravel || defaultOptions.instantTravel;

        // the zenith angle for a camera rotation will be between these two values
        this.minZenithAngle = (options.minZenithAngle || defaultOptions.minZenithAngle) * Math.PI / 180;
        // max value should be less than 90 deg (90 = parallel to the ground)
        this.maxZenithAngle = (options.maxZenithAngle || defaultOptions.maxZenithAngle) * Math.PI / 180;

        // focus policy options
        this.focusOnMouseOver = options.focusOnMouseOver || defaultOptions.focusOnMouseOver;
        this.focusOnMouseClick = options.focusOnMouseClick || defaultOptions.focusOnMouseClick;

        // set collision options
        this.handleCollision = options.handleCollision === undefined ?
            defaultOptions.handleCollision : options.handleCollision;
        this.minDistanceCollision = defaultOptions.minDistanceCollision;

        // enable smart travel
        this.enableSmartTravel = options.enableSmartTravel === undefined ? defaultOptions.enableSmartTravel : options.enableSmartTravel;

        startPosition.copy(this.camera.position);
        startQuaternion.copy(this.camera.quaternion);

        // control state
        this.state = STATE.NONE;

        if (this.view.controls) {
            // esLint-disable-next-line no-console
            console.warn('Deprecated use of PlanarControls. See examples to correct PlanarControls implementation.');
            this.view.controls.dispose();
        }
        this.view.controls = this;

        // eventListeners handlers
        this._handlerOnKeyDown = this.onKeyDown.bind(this);
        this._handlerOnMouseDown = this.onMouseDown.bind(this);
        this._handlerOnMouseUp = this.onMouseUp.bind(this);
        this._handlerOnMouseMove = this.onMouseMove.bind(this);
        this._handlerOnMouseWheel = this.onMouseWheel.bind(this);
        this._handlerFocusOnMouseClick = this.onMouseClick.bind(this);
        this._handlerFocusOnMouseOver = this.onMouseOver.bind(this);
        this._handlerContextMenu = this.onContextMenu.bind(this);
        this._handlerUpdate = this.update.bind(this);

        // add this PlanarControl instance to the view's frameRequesters
        // with this, PlanarControl.update() will be called each frame
        this.view.addFrameRequester(
            MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE,
            this._handlerUpdate,
        );

        // event listeners for user input (to activate the controls)
        this.addInputListeners();
    }

    dispose() {
        this.removeInputListeners();
        this.view.removeFrameRequester(
            MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE,
            this._handlerUpdate,
        );
    }

    /**
     * update the view and camera if needed, and handles the animated travel
     * @param   {number}    dt                  the delta time between two updates in millisecond
     * @param   {boolean}   updateLoopRestarted true if we just started rendering
     * @ignore
     */
    update(dt, updateLoopRestarted) {
        // We test if camera collides to the geometry layer or is too close to the ground, and adjust its altitude in
        // case
        if (this.handleCollision) { // check distance to the ground/surface geometry (could be another geometry layer)
            this.view.camera.adjustAltitudeToAvoidCollisionWithLayer(
                this.view,
                this.view.tileLayer,
                this.minDistanceCollision,
            );
        }
        // dt will not be relevant when we just started rendering. We consider a 1-frame move in this case
        if (updateLoopRestarted) {
            dt = 16;
        }
        if (this.state !== STATE.NONE) {
            this.view.dispatchEvent({
                type: PLANAR_CONTROL_EVENT.MOVED,
            });
        }
        if (this.state === STATE.TRAVEL) {
            this.handleTravel(dt);
            this.view.notifyChange(this.camera);
        }
        if (this.state === STATE.DRAG) {
            this.handleDragMovement();
            this.view.notifyChange(this.camera);
        }
        if (this.state === STATE.ROTATE && this.enableRotation) {
            this.handleRotation();
            this.view.notifyChange(this.camera);
        }
        if (this.state === STATE.PAN) {
            this.handlePanMovement();
            this.view.notifyChange(this.camera);
        }
        deltaMousePosition.set(0, 0);
    }

    /**
     * Initiate a drag movement (translation on (xy) plane). The movement value is derived from the actual world
     * point under the mouse cursor. This allows user to 'grab' a world point and drag it to move.
     *
     * @ignore
     */
    initiateDrag() {
        this.state = STATE.DRAG;

        // the world point under mouse cursor when the drag movement is started
        dragStart.copy(this.getWorldPointAtScreenXY(mousePosition));

        // the difference between start and end cursor position
        dragDelta.set(0, 0, 0);
    }

    /**
     * Handle the drag movement (translation on (xy) plane) when user moves the mouse while in STATE.DRAG. The
     * drag movement is previously initiated by [initiateDrag]{@link PlanarControls#initiateDrag}. Compute the
     * drag value and update the camera controls. The movement value is derived from the actual world point under
     * the mouse cursor. This allows the user to 'grab' a world point and drag it to move.
     *
     * @ignore
     */
    handleDragMovement() {
        // the world point under the current mouse cursor position, at same altitude than dragStart
        dragEnd.copy(this.getWorldPointFromMathPlaneAtScreenXY(mousePosition, dragStart.z));

        // the difference between start and end cursor position
        dragDelta.subVectors(dragStart, dragEnd);

        // update the camera controls
        this.camera.position.add(dragDelta);

        dragDelta.set(0, 0, 0);
    }

    /**
     * Initiate a pan movement (local translation on (xz) plane).
     *
     * @ignore
     */
    initiatePan() {
        this.state = STATE.PAN;
    }

    /**
     * Handle the pan movement (translation on local x / world z plane) when user moves the mouse while
     * STATE.PAN. The drag movement is previously initiated by [initiatePan]{@link PlanarControls#initiatePan}.
     * Compute the pan value and update the camera controls.
     *
     * @ignore
     */
    handlePanMovement() {
        // normalized (between 0 and 1) distance between groundLevel and maxAltitude
        const distToGround = THREE.MathUtils.clamp(
            (this.camera.position.z - this.groundLevel) / this.maxAltitude,
            0,
            1,
        );

        // pan movement speed, adjusted according to altitude
        const panSpeed = THREE.MathUtils.lerp(
            this.minPanSpeed,
            this.maxPanSpeed,
            distToGround,
        );

        // lateral movement (local x axis)
        vect.set(panSpeed * -1 * deltaMousePosition.x, 0, 0);
        this.camera.position.copy(this.camera.localToWorld(vect));

        // vertical movement (world z axis)
        const newAltitude = this.camera.position.z + panSpeed * deltaMousePosition.y;

        // check if altitude is valid
        if (this.groundLevel < newAltitude && newAltitude < this.maxAltitude) {
            this.camera.position.z = newAltitude;
        }
    }

    /**
     * Initiate a rotate (orbit) movement.
     *
     * @ignore
     */
    initiateRotation() {
        this.state = STATE.ROTATE;

        centerPoint.copy(this.getWorldPointAtScreenXY(new THREE.Vector2(
            0.5 * this.view.mainLoop.gfxEngine.width,
            0.5 * this.view.mainLoop.gfxEngine.height,
        )));

        const radius = this.camera.position.distanceTo(centerPoint);
        phi = Math.acos((this.camera.position.z - centerPoint.z) / radius);
    }

    /**
     * Handle the rotate movement (orbit) when user moves the mouse while in STATE.ROTATE. The movement is an
     * orbit around `centerPoint`, the camera focus point (ground point at screen center). The rotate movement
     * is previously initiated in [initiateRotation]{@link PlanarControls#initiateRotation}.
     * Compute the new position value and update the camera controls.
     *
     * @ignore
     */
    handleRotation() {
        // angle deltas
        // deltaMousePosition is computed in onMouseMove / onMouseDowns
        const thetaDelta = -this.rotateSpeed * deltaMousePosition.x / this.view.mainLoop.gfxEngine.width;
        const phiDelta = -this.rotateSpeed * deltaMousePosition.y / this.view.mainLoop.gfxEngine.height;

        // the vector from centerPoint (focus point) to camera position
        const offset = this.camera.position.clone().sub(centerPoint);

        if (thetaDelta !== 0 || phiDelta !== 0) {
            if ((phi + phiDelta >= this.minZenithAngle)
            && (phi + phiDelta <= this.maxZenithAngle)
            && (phiDelta !== 0)) {
                // rotation around X (altitude)
                phi += phiDelta;

                vect.set(0, 0, 1);
                quat.setFromUnitVectors(this.camera.up, vect);
                offset.applyQuaternion(quat);

                vect.setFromMatrixColumn(this.camera.matrix, 0);
                quat.setFromAxisAngle(vect, phiDelta);
                offset.applyQuaternion(quat);

                vect.set(0, 0, 1);
                quat.setFromUnitVectors(this.camera.up, vect).invert();
                offset.applyQuaternion(quat);
            }
            if (thetaDelta !== 0) {
                // rotation around Z (azimuth)
                vect.set(0, 0, 1);
                quat.setFromAxisAngle(vect, thetaDelta);
                offset.applyQuaternion(quat);
            }
        }

        this.camera.position.copy(offset);
        this.camera.lookAt(vectorZero);
        this.camera.position.add(centerPoint);
        this.camera.updateMatrixWorld();
    }

    /**
     * Triggers a Zoom animated movement (travel) toward / away from the world point under the mouse cursor. The
     * zoom intensity varies according to the distance between the camera and the point. The closer to the ground,
     * the lower the intensity. Orientation will not change (null parameter in the call to
     * [initiateTravel]{@link PlanarControls#initiateTravel} function).
     *
     * @param   {Event} event   the mouse wheel event.
     * @ignore
     */
    initiateZoom(event) {
        let delta;

        // mousewheel delta
        if (undefined !== event.wheelDelta) {
            delta = event.wheelDelta;
        } else if (undefined !== event.detail) {
            delta = -event.detail;
        }

        const pointUnderCursor = this.getWorldPointAtScreenXY(mousePosition);
        const newPos = new THREE.Vector3();

        // Zoom IN
        if (delta > 0) {
            // target position
            newPos.lerpVectors(
                this.camera.position,
                pointUnderCursor,
                this.zoomInFactor,
            );
            // initiate travel
            this.initiateTravel(
                newPos,
                this.zoomTravelTime,
                null,
                false,
            );
        // Zoom OUT
        } else if (delta < 0 && this.maxAltitude > this.camera.position.z) {
            // target position
            newPos.lerpVectors(
                this.camera.position,
                pointUnderCursor,
                -1 * this.zoomOutFactor,
            );
            // initiate travel
            this.initiateTravel(
                newPos,
                this.zoomTravelTime,
                null,
                false,
            );
        }
    }

    /**
     * Triggers a 'smart zoom' animated movement (travel) toward the point under mouse cursor. The camera will be
     * smoothly moved and oriented close to the target, at a determined height and distance.
     *
     * @ignore
     */
    initiateSmartZoom() {
        const pointUnderCursor = this.getWorldPointAtScreenXY(mousePosition);

        // direction of the movement, projected on xy plane and normalized
        const dir = new THREE.Vector3();
        dir.copy(pointUnderCursor).sub(this.camera.position);
        dir.z = 0;
        dir.normalize();

        const distanceToPoint = this.camera.position.distanceTo(pointUnderCursor);

        // camera height (altitude above ground) at the end of the travel, 5000 is an empirical smoothing distance
        const targetHeight = THREE.MathUtils.lerp(
            this.smartZoomHeightMin,
            this.smartZoomHeightMax,
            Math.min(distanceToPoint / 5000, 1),
        );

        // camera position at the end of the travel
        const moveTarget = new THREE.Vector3();
        moveTarget.copy(pointUnderCursor);
        if (this.enableRotation) {
            moveTarget.add(dir.multiplyScalar(-targetHeight * 2));
        }
        moveTarget.z = pointUnderCursor.z + targetHeight;

        // initiate the travel
        this.initiateTravel(
            moveTarget,
            'auto',
            pointUnderCursor,
            true,
        );
    }

    /**
     * Triggers an animated movement and rotation for the camera.
     *
     * @param   {THREE.Vector3} targetPos   The target position of the camera (reached at the end).
     * @param   {number|string}        travelTime  Set to `auto` or set to a duration in seconds. If set to `auto`,
     * travel time will be set to a duration between `autoTravelTimeMin` and `autoTravelTimeMax` according to
     * the distance and the angular difference between start and finish.
     * @param   {(string|THREE.Vector3|THREE.Quaternion)}   targetOrientation   define the target rotation of
     * the camera :
     * <ul>
     *     <li>if targetOrientation is a world point (Vector3) : the camera will lookAt() this point</li>
     *     <li>if targetOrientation is a quaternion : this quaternion will define the final camera orientation </li>
     *     <li>if targetOrientation is neither a world point nor a quaternion : the camera will keep its starting
     *     orientation</li>
     * </ul>
     * @param   {boolean}       useSmooth   animation is smoothed using the `smooth(value)` function (slower
     * at start and finish).
     *
     * @ignore
     */
    initiateTravel(targetPos, travelTime, targetOrientation, useSmooth) {
        this.state = STATE.TRAVEL;
        this.view.notifyChange(this.camera);
        // the progress of the travel (animation alpha)
        travelAlpha = 0;
        // update cursor
        this.updateMouseCursorType();

        travelUseRotation = this.enableRotation
            && targetOrientation
            && (targetOrientation.isQuaternion || targetOrientation.isVector3);
        travelUseSmooth = useSmooth;

        // start position (current camera position)
        travelStartPos.copy(this.camera.position);

        // start rotation (current camera rotation)
        travelStartRot.copy(this.camera.quaternion);

        // setup the end rotation :
        if (travelUseRotation) {
            if (targetOrientation.isQuaternion) {
                // case where targetOrientation is a quaternion
                travelEndRot.copy(targetOrientation);
            } else if (targetOrientation.isVector3) {
                // case where targetOrientation is a Vector3
                if (targetPos === targetOrientation) {
                    this.camera.lookAt(targetOrientation);
                    travelEndRot.copy(this.camera.quaternion);
                    this.camera.quaternion.copy(travelStartRot);
                } else {
                    this.camera.position.copy(targetPos);
                    this.camera.lookAt(targetOrientation);
                    travelEndRot.copy(this.camera.quaternion);
                    this.camera.quaternion.copy(travelStartRot);
                    this.camera.position.copy(travelStartPos);
                }
            }
        }

        // end position
        travelEndPos.copy(targetPos);


        // beginning of the travel duration setup
        if (this.instantTravel) {
            travelDuration = 0;
        } else if (travelTime === 'auto') {
            // case where travelTime is set to `auto` : travelDuration will be a value between autoTravelTimeMin and
            // autoTravelTimeMax depending on travel distance and travel angular difference

            // a value between 0 and 1 according to the travel distance. Adjusted by autoTravelTimeDist parameter
            const normalizedDistance = Math.min(
                1,
                targetPos.distanceTo(this.camera.position) / this.autoTravelTimeDist,
            );

            travelDuration = THREE.MathUtils.lerp(
                this.autoTravelTimeMin,
                this.autoTravelTimeMax,
                normalizedDistance,
            );

            // if travel changes camera orientation, travel duration is adjusted according to angularDifference
            // this allows for a smoother travel (more time for the camera to rotate)
            // final duration will not exceed autoTravelTimeMax
            if (travelUseRotation) {
                // value is normalized between 0 and 1
                const angularDifference = 0.5 - 0.5 * travelEndRot.normalize().dot(this.camera.quaternion.normalize());

                travelDuration *= 1 + 2 * angularDifference;
                travelDuration = Math.min(travelDuration, this.autoTravelTimeMax);
            }
        } else {
            // case where travelTime !== `auto` : travelTime is a duration in seconds given as parameter
            travelDuration = travelTime;
        }
    }

    /**
     * Resume normal behavior after a travel is completed
     *
     * @ignore
     */
    endTravel() {
        this.camera.position.copy(travelEndPos);

        if (travelUseRotation) {
            this.camera.quaternion.copy(travelEndRot);
        }

        this.state = STATE.NONE;

        this.updateMouseCursorType();
    }

    /**
     * Handle the animated movement and rotation of the camera in `travel` state.
     *
     * @param   {number}    dt  the delta time between two updates in milliseconds
     * @ignore
     */
    handleTravel(dt) {
        travelAlpha += (dt / 1000) / travelDuration;

        // the animation alpha, between 0 (start) and 1 (finish)
        const alpha = (travelUseSmooth) ? this.smooth(travelAlpha) : travelAlpha;

        // new position
        this.camera.position.lerpVectors(
            travelStartPos,
            travelEndPos,
            alpha,
        );

        // new rotation
        if (travelUseRotation === true) {
            THREE.Quaternion.slerp(
                travelStartRot,
                travelEndRot,
                this.camera.quaternion,
                alpha,
            );
        }

        // completion test
        if (travelAlpha > 1) {
            this.endTravel();
        }
    }

    /**
     * Triggers an animated movement (travel) to set the camera to top view, above the focus point,
     * at altitude = distanceToFocusPoint.
     *
     * @ignore
     */
    goToTopView() {
        const topViewPos = new THREE.Vector3();
        const targetQuat = new THREE.Quaternion();

        // the top view position is above the camera focus point, at an altitude = distanceToPoint
        topViewPos.copy(this.getWorldPointAtScreenXY(new THREE.Vector2(
            0.5 * this.view.mainLoop.gfxEngine.width,
            0.5 * this.view.mainLoop.gfxEngine.height,
        )));
        topViewPos.z += Math.min(this.maxAltitude, this.camera.position.distanceTo(topViewPos));

        targetQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);

        // initiate the travel
        this.initiateTravel(
            topViewPos,
            'auto',
            targetQuat,
            true,
        );
    }

    /**
     * Triggers an animated movement (travel) to set the camera to starting view
     *
     * @ignore
     */
    goToStartView() {
        this.initiateTravel(
            startPosition,
            'auto',
            startQuaternion,
            true,
        );
    }

    /**
     * Returns the world point (xyz) under the posXY screen point. The point belong to an abstract mathematical
     * plane of specified altitude (does not us actual geometry).
     *
     * @param   {THREE.Vector2} posXY       the mouse position in screen space (unit : pixel)
     * @param   {number}        altitude    the altitude (z) of the mathematical plane
     * @return  {THREE.Vector3}
     * @ignore
     */
    getWorldPointFromMathPlaneAtScreenXY(posXY, altitude) {
        vect.set(
            (posXY.x / this.view.mainLoop.gfxEngine.width) * 2 - 1,
            -(posXY.y / this.view.mainLoop.gfxEngine.height) * 2 + 1,
            0.5,
        );
        vect.unproject(this.camera);
        // dir : direction toward the point on the plane
        const dir = vect.sub(this.camera.position).normalize();
        // distance from camera to point on the plane
        const distance = (altitude - this.camera.position.z) / dir.z;

        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    /**
     * Returns the world point (xyz) under the posXY screen point. If geometry is under the cursor, the point is
     * obtained with getPickingPositionFromDepth. If no geometry is under the cursor, the point is obtained with
     * [getWorldPointFromMathPlaneAtScreenXY]{@link PlanarControls#getWorldPointFromMathPlaneAtScreenXY}.
     *
     * @param   {THREE.Vector2} posXY   the mouse position in screen space (unit : pixel)
     * @return  {THREE.Vector3}
     * @ignore
     */
    getWorldPointAtScreenXY(posXY) {
        // check if there is a valid geometry under cursor
        if (this.view.getPickingPositionFromDepth(posXY, pointUnderCursor)) {
            return pointUnderCursor;
        } else {
            // if not, we use the mathematical plane at altitude = groundLevel
            return this.getWorldPointFromMathPlaneAtScreenXY(
                posXY,
                this.groundLevel,
            );
        }
    }

    /**
     * Add all the input event listeners (activate the controls).
     *
     * @ignore
     */
    addInputListeners() {
        this.view.domElement.addEventListener('keydown', this._handlerOnKeyDown, false);
        this.view.domElement.addEventListener('mousedown', this._handlerOnMouseDown, false);
        this.view.domElement.addEventListener('mouseup', this._handlerOnMouseUp, false);
        this.view.domElement.addEventListener('mousemove', this._handlerOnMouseMove, false);
        this.view.domElement.addEventListener('mousewheel', this._handlerOnMouseWheel, false);
        // focus policy
        if (this.focusOnMouseOver) {
            this.view.domElement.addEventListener('mouseover', this._handlerFocusOnMouseOver, false);
        }
        if (this.focusOnMouseClick) {
            this.view.domElement.addEventListener('click', this._handlerFocusOnMouseClick, false);
        }
        // prevent the default context menu from appearing when right-clicking
        // this allows to use right-click for input without the menu appearing
        this.view.domElement.addEventListener('contextmenu', this._handlerContextMenu, false);
        // for firefox
        this.view.domElement.addEventListener('MozMousePixelScroll', this._handlerOnMouseWheel, false);
    }

    /**
     * Removes all the input listeners (deactivate the controls).
     *
     * @ignore
     */
    removeInputListeners() {
        this.view.domElement.removeEventListener('keydown', this._handlerOnKeyDown, true);
        this.view.domElement.removeEventListener('mousedown', this._handlerOnMouseDown, false);
        this.view.domElement.removeEventListener('mouseup', this._handlerOnMouseUp, false);
        this.view.domElement.removeEventListener('mousemove', this._handlerOnMouseMove, false);
        this.view.domElement.removeEventListener('mousewheel', this._handlerOnMouseWheel, false);
        this.view.domElement.removeEventListener('mouseover', this._handlerFocusOnMouseOver, false);
        this.view.domElement.removeEventListener('click', this._handlerFocusOnMouseClick, false);
        this.view.domElement.removeEventListener('contextmenu', this._handlerContextMenu, false);
        // for firefox
        this.view.domElement.removeEventListener('MozMousePixelScroll', this._handlerOnMouseWheel, false);
    }

    /**
     * Update the cursor image according to the control state.
     *
     * @ignore
     */
    updateMouseCursorType() {
        switch (this.state) {
            case STATE.NONE:
                this.view.domElement.style.cursor = 'auto';
                break;
            case STATE.DRAG:
                this.view.domElement.style.cursor = 'move';
                break;
            case STATE.PAN:
                this.view.domElement.style.cursor = 'cell';
                break;
            case STATE.TRAVEL:
                this.view.domElement.style.cursor = 'wait';
                break;
            case STATE.ROTATE:
                this.view.domElement.style.cursor = 'move';
                break;
            default:
                break;
        }
    }

    updateMousePositionAndDelta(event) {
        this.view.eventToViewCoords(event, mousePosition);

        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);

        lastMousePosition.copy(mousePosition);
    }

    /**
     * Catch and manage the event when a touch on the mouse is downs.
     *
     * @param   {Event} event   the current event (mouse left or right button clicked, mouse wheel button actioned).
     * @ignore
     */
    onMouseDown(event) {
        event.preventDefault();

        if (STATE.TRAVEL === this.state) {
            return;
        }

        this.updateMousePositionAndDelta(event);

        if (mouseButtons.LEFTCLICK === event.button) {
            if (event.ctrlKey) {
                this.initiateRotation();
            } else {
                this.initiateDrag();
            }
        } else if (mouseButtons.MIDDLECLICK === event.button) {
            if (this.enableSmartTravel) {
                this.initiateSmartZoom();
            } else {
                return;
            }
        } else if (mouseButtons.RIGHTCLICK === event.button) {
            this.initiatePan();
        }

        this.updateMouseCursorType();
    }

    /**
     * Catch and manage the event when a touch on the mouse is released.
     *
     * @param   {Event} event   the current event
     * @ignore
     */
    onMouseUp(event) {
        event.preventDefault();

        if (STATE.TRAVEL !== this.state) {
            this.state = STATE.NONE;
        }

        this.updateMouseCursorType();
    }

    /**
     * Catch and manage the event when the mouse is moved.
     *
     * @param   {Event} event   the current event.
     * @ignore
     */
    onMouseMove(event) {
        event.preventDefault();

        this.updateMousePositionAndDelta(event);

        // notify change if moving
        if (STATE.NONE !== this.state) {
            this.view.notifyChange();
        }
    }

    /**
     * Catch and manage the event when a key is down.
     *
     * @param   {Event} event   the current event
     * @ignore
     */
    onKeyDown(event) {
        if (STATE.TRAVEL === this.state) {
            return;
        }
        if (keys.T === event.keyCode) {
            this.goToTopView();
        }
        if (keys.Y === event.keyCode) {
            this.goToStartView();
        }
        if (keys.SPACE === event.keyCode) {
            this.initiateSmartZoom(event);
        }
    }

    /**
     * Catch and manage the event when the mouse wheel is rolled.
     *
     * @param   {Event} event   the current event
     * @ignore
     */
    onMouseWheel(event) {
        event.preventDefault();
        event.stopPropagation();

        if (STATE.NONE === this.state) {
            this.initiateZoom(event);
        }
    }

    /**
     * Set the focus on view's domElement according to focus policy regarding MouseOver
     *
     * @ignore
     */
    onMouseOver() {
        this.view.domElement.focus();
    }

    /**
     * Set the focus on view's domElement according to focus policy regarding MouseClick
     *
     * @ignore
     */
    onMouseClick() {
        this.view.domElement.focus();
    }

    /**
     * Catch and manage the event when the context menu is called (by a right-click on the window). We use this
     * to prevent the context menu from appearing so we can use right click for other inputs.
     *
     * @param   {Event} event   the current event
     * @ignore
     */
    onContextMenu(event) {
        event.preventDefault();
    }

    /**
     * Smoothing function (sigmoid) : based on h01 Hermite function.
     *
     * @param   {number}    value   the value to be smoothed, between 0 and 1.
     * @return  {number}            a value between 0 and 1.
     * @ignore
     */
    smooth(value) {
        // p between 1.0 and 1.5 (empirical)
        const p = 1.20;
        return (value ** 2 * (3 - 2 * value)) ** p;
    }
}

export default PlanarControls;
