/* globals window */
import * as THREE from 'three';
import AnimationPlayer, { Animation } from '../../Core/AnimationPlayer';
import Coordinates, { ellipsoidSizes } from '../../Core/Geographic/Coordinates';
import { computeTileZoomFromDistanceCamera, computeDistanceCameraFromTileZoom } from '../../Process/GlobeTileProcessing';
import StateControl from './StateControl';
import CameraUtils from '../../utils/CameraUtils';

// private members
const EPS = 0.000001;

// Orbit
const rotateStart = new THREE.Vector2();
const rotateEnd = new THREE.Vector2();
const rotateDelta = new THREE.Vector2();
const spherical = new THREE.Spherical(1.0, 0.01, 0);
const sphericalDelta = new THREE.Spherical(1.0, 0, 0);
let orbitScale = 1.0;

// Pan
const panStart = new THREE.Vector2();
const panEnd = new THREE.Vector2();
const panDelta = new THREE.Vector2();
const panOffset = new THREE.Vector3();

// Dolly
const dollyStart = new THREE.Vector2();
const dollyEnd = new THREE.Vector2();
const dollyDelta = new THREE.Vector2();

// Globe move
const moveAroundGlobe = new THREE.Quaternion();
const cameraTarget = new THREE.Object3D();
cameraTarget.matrixWorldInverse = new THREE.Matrix4();

const xyz = new Coordinates('EPSG:4978', 0, 0, 0);
const c = new Coordinates('EPSG:4326', 0, 0, 0);
// Position object on globe
function positionObject(newPosition, object) {
    xyz.set('EPSG:4978', newPosition).as('EPSG:4326', c);
    object.position.copy(newPosition);
    object.lookAt(c.geodesicNormal.add(newPosition));
    object.rotateX(Math.PI * 0.5);
    object.updateMatrixWorld(true);
}

// Save the last time of mouse move for damping
let lastTimeMouseMove = 0;

// Animations and damping
let enableAnimation = true;
let player = null;
const dampingFactor = 0.25;
const dampingMove = new THREE.Quaternion(0, 0, 0, 1);
const animationDampingMove = new Animation({ duration: 120, name: 'damping-move' });
const animationDampingOrbital = new Animation({ duration: 60, name: 'damping-orbit' });

// Pan Move
const panVector = new THREE.Vector3();

// Save last transformation
const lastPosition = new THREE.Vector3();
const lastQuaternion = new THREE.Quaternion();

// Tangent sphere to ellipsoid
const pickSphere = new THREE.Sphere();
const pickingPoint = new THREE.Vector3();

// Set to true to enable target helper
const enableTargetHelper = false;
const helpers = {};

if (enableTargetHelper) {
    helpers.picking = new THREE.AxesHelper(500000);
    helpers.target = new THREE.AxesHelper(500000);
}

// Handle function
let _handlerMouseMove;
let _handlerMouseUp;
// current downed key
let currentKey;

/**
 * Globe control pan event. Fires after camera pan
 * @event GlobeControls#pan-changed
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} orientation-changed
 */
/**
 * Globe control orientation event. Fires when camera's orientation change
 * @event GlobeControls#orientation-changed
 * @property new {object}
 * @property new.tilt {number} the new value of the tilt of the camera
 * @property new.heading {number} the new value of the heading of the camera
 * @property previous {object}
 * @property previous.tilt {number} the previous value of the tilt of the camera
 * @property previous.heading {number} the previous value of the heading of the camera
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} orientation-changed
 */
 /**
 * Globe control range event. Fires when camera's range to target change
 * @event GlobeControls#range-changed
 * @property new {number} the new value of the range
 * @property previous {number} the previous value of the range
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} range-changed
 */
 /**
 * Globe control camera's target event. Fires when camera's target change
 * @event GlobeControls#camera-target-changed
 * @property new {object}
 * @property new {Coordinates} the new camera's target coordinates
 * @property previous {Coordinates} the previous camera's target coordinates
 * @property target {GlobeControls} dispatched on controls
 * @property type {string} camera-target-changed
 */

/**
 * globe controls events
 * @property PAN_CHANGED {string} Fires after camera pan
 * @property ORIENTATION_CHANGED {string} Fires when camera's orientation change
 * @property RANGE_CHANGED {string} Fires when camera's range to target change
 * @property CAMERA_TARGET_CHANGED {string} Fires when camera's target change
 */

export const CONTROL_EVENTS = {
    PAN_CHANGED: 'pan-changed',
    ORIENTATION_CHANGED: 'orientation-changed',
    RANGE_CHANGED: 'range-changed',
    CAMERA_TARGET_CHANGED: 'camera-target-changed',
};

let previous;

/**
 * GlobeControls is a camera controller
 *
 * @class      GlobeControls
 * @param      {GlobeView}  view the view where the control will be used
 * @param      {Coordinates}  targetCoordinate the target looked by camera, at initialization
 * @param      {number}  range distance between the target looked and camera, at initialization
 * @param      {number}  globeRadius The globe's radius
 * @param      {object}  options
 * @param      {number}  options.zoomSpeed Speed zoom with mouse
 * @param      {number}  options.rotateSpeed Speed camera rotation in orbit and panoramic mode
 * @param      {number}  options.minDistance Minimum distance between ground and camera
 * @param      {number}  options.maxDistance Maximum distance between ground and camera
 * @param      {bool}  options.handleCollision enable collision camera with ground
 * @property   {bool} enabled enable control
 * @property   {number} minDistance Minimum distance between ground and camera
 * @property   {number} maxDistance Maximum distance between ground and camera
 * @property   {number} zoomSpeed Speed zoom with mouse
 * @property   {number} rotateSpeed Speed camera rotation in orbit and panoramic mode
 * @property   {number} minDistanceCollision Minimum distance collision between ground and camera
 * @property   {bool} enableDamping enable camera damping, if it's disabled the camera immediately when the mouse button is released.
 * If it's enabled, the camera movement is decelerate.
 */
function GlobeControls(view, targetCoordinate, range, globeRadius, options = {}) {
    player = new AnimationPlayer();
    this._view = view;
    this.camera = view.camera.camera3D;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;

    // State control
    let state;
    const states = new StateControl();
    state = states.NONE;

    this.getStates = () => states;

    // Set to false to disable this control
    this.enabled = true;

    // This option actually enables dollying in and out; left as "zoom" for
    // backwards compatibility
    this.zoomSpeed = options.zoomSpeed || 2.0;

    // Limits to how far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = options.minDistance || 300;
    this.maxDistance = options.maxDistance || globeRadius * 8.0;

    // Limits to how far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // Set to true to disable this control
    this.rotateSpeed = options.rotateSpeed || 0.25;

    // Set to true to disable this control
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    // TODO Warning minPolarAngle = 0.01 -> it isn't possible to be perpendicular on Globe
    this.minPolarAngle = THREE.Math.degToRad(0.5); // radians
    this.maxPolarAngle = THREE.Math.degToRad(86); // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = -Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set collision options
    this.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
    this.minDistanceCollision = 60;

    // Set to true to disable use of the keys
    this.enableKeys = true;

    // Enable Damping
    this.enableDamping = true;

    this.startEvent = {
        type: 'start',
    };
    this.endEvent = {
        type: 'end',
    };

    this.getDollyScale = function getDollyScale() {
        return Math.pow(0.95, this.zoomSpeed);
    };

    this.rotateLeft = function rotateLeft(angle = 0) {
        sphericalDelta.theta -= angle;
    };

    this.rotateUp = function rotateUp(angle = 0) {
        sphericalDelta.phi -= angle;
    };

    // pass in distance in world space to move left
    this.panLeft = function panLeft(distance) {
        const te = this.camera.matrix.elements;
        // get X column of matrix
        panOffset.fromArray(te);
        panOffset.multiplyScalar(-distance);
        panVector.add(panOffset);
    };

    // pass in distance in world space to move up
    this.panUp = function panUp(distance) {
        const te = this.camera.matrix.elements;
        // get Y column of matrix
        panOffset.fromArray(te, 4);
        panOffset.multiplyScalar(distance);
        panVector.add(panOffset);
    };

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this._mouseToPan = function _mouseToPan(deltaX, deltaY) {
        const gfx = view.mainLoop.gfxEngine;
        state = states.PAN;
        if (this.camera instanceof THREE.PerspectiveCamera) {
            let targetDistance = this.camera.position.distanceTo(this.getCameraTargetPosition());
            // half of the fov is center to top of screen
            targetDistance *= 2 * Math.tan(THREE.Math.degToRad(this.camera.fov * 0.5));

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(deltaX * targetDistance / gfx.width * this.camera.aspect);
            this.panUp(deltaY * targetDistance / gfx.height);
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            // orthographic
            this.panLeft(deltaX * (this.camera.right - this.camera.left) / gfx.width);
            this.panUp(deltaY * (this.camera.top - this.camera.bottom) / gfx.height);
        }
    };

    this.dollyIn = function dollyIn(dollyScale) {
        if (dollyScale === undefined) {
            dollyScale = this.getDollyScale();
        }

        if (this.camera instanceof THREE.PerspectiveCamera) {
            orbitScale /= dollyScale;
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            this.camera.zoom = THREE.Math.clamp(this.camera.zoom * dollyScale, this.minZoom, this.maxZoom);
            this.camera.updateProjectionMatrix();
            view.notifyChange(this.camera);
        }
    };

    this.dollyOut = function dollyOut(dollyScale) {
        if (dollyScale === undefined) {
            dollyScale = this.getDollyScale();
        }

        if (this.camera instanceof THREE.PerspectiveCamera) {
            orbitScale *= dollyScale;
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            this.camera.zoom = THREE.Math.clamp(this.camera.zoom / dollyScale, this.minZoom, this.maxZoom);
            this.camera.updateProjectionMatrix();
            view.notifyChange(this.camera);
        }
    };

    const quaterPano = new THREE.Quaternion();
    const quaterAxis = new THREE.Quaternion();
    const axisX = new THREE.Vector3(1, 0, 0);
    let minDistanceZ = Infinity;
    const getMinDistanceCameraBoundingSphereObbsUp = (tile) => {
        if (tile.level > 10 && tile.children.length == 1 && tile.geometry) {
            const obb = tile.OBB();
            const sphereCamera = { position: this.camera.position.clone(), radius: this.minDistanceCollision };
            if (obb.isSphereAboveXYBox(sphereCamera)) {
                minDistanceZ = Math.min(sphereCamera.position.z - obb.box3D.max.z, minDistanceZ);
            }
        }
    };

    const lastNormalizedIntersection = new THREE.Vector3();
    const normalizedIntersection = new THREE.Vector3();
    const resultDamping = [];

    const update = () => {
        // We compute distance between camera's bounding sphere and geometry's obb up face
        if (this.handleCollision) { // We check distance to the ground/surface geometry
            // add minDistanceZ between camera's bounding and tiles's oriented bounding box (up face only)
            // Depending on the distance of the camera with obbs, we add a slowdown or constrain to the movement.
            // this constraint or deceleration is suitable for two types of movement MOVE_GLOBE and ORBIT.
            // This constraint or deceleration inversely proportional to the camera/obb distance
            if (view.tileLayer) {
                minDistanceZ = Infinity;
                for (const tile of view.tileLayer.level0Nodes) {
                    tile.traverse(getMinDistanceCameraBoundingSphereObbsUp);
                }
            }
        }
        switch (state) {
            // MOVE_GLOBE Rotate globe with mouse
            case states.MOVE_GLOBE:
                if (minDistanceZ < 0) {
                    cameraTarget.translateY(-minDistanceZ);
                    this.camera.position.setLength(this.camera.position.length() - minDistanceZ);
                } else if (minDistanceZ < this.minDistanceCollision) {
                    const translate = this.minDistanceCollision * (1.0 - minDistanceZ / this.minDistanceCollision);
                    cameraTarget.translateY(translate);
                    this.camera.position.setLength(this.camera.position.length() + translate);
                }
                lastNormalizedIntersection.copy(normalizedIntersection).applyQuaternion(moveAroundGlobe);
                cameraTarget.position.applyQuaternion(moveAroundGlobe);
                this.camera.position.applyQuaternion(moveAroundGlobe);
                break;
            // PAN Move camera in projection plan
            case states.PAN:
                this.camera.position.add(panVector);
                cameraTarget.position.add(panVector);
                break;
            // PANORAMIC Move target camera
            case states.PANORAMIC: {
                this.camera.worldToLocal(cameraTarget.position);
                const normal = this.camera.position.clone().normalize().applyQuaternion(this.camera.quaternion.clone().inverse());
                quaterPano.setFromAxisAngle(normal, sphericalDelta.theta).multiply(quaterAxis.setFromAxisAngle(axisX, sphericalDelta.phi));
                cameraTarget.position.applyQuaternion(quaterPano);
                this.camera.localToWorld(cameraTarget.position);
                break; }
            // ZOOM/ORBIT Move Camera around the target camera
            default: {
                // get camera position in local space of target
                this.camera.position.applyMatrix4(cameraTarget.matrixWorldInverse);

                // angle from z-axis around y-axis
                if (sphericalDelta.theta || sphericalDelta.phi) {
                    spherical.setFromVector3(this.camera.position);
                }
                // far underground
                const dynamicRadius = spherical.radius * Math.sin(this.minPolarAngle);
                const slowdownLimit = dynamicRadius * 8;
                const contraryLimit = dynamicRadius * 2;
                const minContraintPhi = -0.01;

                if (minDistanceZ < slowdownLimit && minDistanceZ > contraryLimit && sphericalDelta.phi > 0) {
                    // slowdown zone : slowdown sphericalDelta.phi
                    const slowdownZone = slowdownLimit - contraryLimit;
                    // the deeper the camera is in this zone, the bigger the factor is
                    const slowdownFactor = 1 - (slowdownZone - (minDistanceZ - contraryLimit)) / slowdownZone;
                    // apply slowdown factor on tilt mouvement
                    sphericalDelta.phi *= slowdownFactor * slowdownFactor;
                } else if (minDistanceZ < contraryLimit && minDistanceZ > -contraryLimit && sphericalDelta.phi > minContraintPhi) {
                    // contraint zone : contraint sphericalDelta.phi
                    const contraryZone = 2 * contraryLimit;
                    // calculation of the angle of rotation which allows to leave this zone
                    let contraryPhi = -Math.asin((contraryLimit - minDistanceZ) * 0.25 / spherical.radius);
                    // clamp contraryPhi to make a less brutal exit
                    contraryPhi = THREE.Math.clamp(contraryPhi, minContraintPhi, 0);
                    // the deeper the camera is in this zone, the bigger the factor is
                    const contraryFactor = 1 - (contraryLimit - minDistanceZ) / contraryZone;
                    sphericalDelta.phi = THREE.Math.lerp(sphericalDelta.phi, contraryPhi, contraryFactor);
                    minDistanceZ -= Math.sin(sphericalDelta.phi) * spherical.radius;
                }
                spherical.theta += sphericalDelta.theta;
                spherical.phi += sphericalDelta.phi;

                // restrict spherical.theta to be between desired limits
                spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, spherical.theta));

                // restrict spherical.phi to be between desired limits
                spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, spherical.phi));
                spherical.radius = this.camera.position.length() * orbitScale;

                // restrict spherical.phi to be betwee EPS and PI-EPS
                spherical.makeSafe();

                // restrict radius to be between desired limits
                spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, spherical.radius));

                this.camera.position.setFromSpherical(spherical);

                // if camera is underground, so move up camera
                if (minDistanceZ < 0) {
                    this.camera.position.y -= minDistanceZ;
                    spherical.setFromVector3(this.camera.position);
                    sphericalDelta.phi = 0;
                }

                cameraTarget.localToWorld(this.camera.position);
            }
        }

        this.camera.up.copy(cameraTarget.position).normalize();
        this.camera.lookAt(cameraTarget.position);

        if (!this.enableDamping) {
            sphericalDelta.theta = 0;
            sphericalDelta.phi = 0;
            moveAroundGlobe.set(0, 0, 0, 1);
        } else {
            sphericalDelta.theta *= (1 - dampingFactor);
            sphericalDelta.phi *= (1 - dampingFactor);
            THREE.Quaternion.slerpFlat(resultDamping, 0, moveAroundGlobe.toArray(), 0, dampingMove.toArray(), 0, dampingFactor * 0.2);
            moveAroundGlobe.fromArray(resultDamping);
        }

        orbitScale = 1;
        panVector.set(0, 0, 0);

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        if (lastPosition.distanceToSquared(this.camera.position) > EPS || 8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS) {
            view.notifyChange(this.camera);

            lastPosition.copy(this.camera.position);
            lastQuaternion.copy(this.camera.quaternion);
        }
        // Launch animationdamping if mouse stops these movements
        if (this.enableDamping && state === states.ORBIT && player.isStopped() && (sphericalDelta.theta > EPS || sphericalDelta.phi > EPS)) {
            player.playLater(animationDampingOrbital, 2);
        }
    };

    this.update = update;

    // Update helper
    const updateHelper = enableTargetHelper ? function updateHelper(position, helper) {
        positionObject(position, helper);
        view.notifyChange(this.camera);
    } : function empty() {};

    const raycaster = new THREE.Raycaster();
    function onMouseMove(event) {
        if (player.isPlaying()) {
            player.stop();
        }
        if (this.enabled === false) return;

        event.preventDefault();
        const coords = view.eventToViewCoords(event);

        switch (state) {
            case states.ORBIT:
            case states.PANORAMIC: {
                rotateEnd.copy(coords);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                const gfx = view.mainLoop.gfxEngine;
                this.rotateLeft(2 * Math.PI * rotateDelta.x / gfx.width * this.rotateSpeed);
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * rotateDelta.y / gfx.height * this.rotateSpeed);

                rotateStart.copy(rotateEnd);
                break; }
            case states.DOLLY:
                dollyEnd.copy(coords);
                dollyDelta.subVectors(dollyEnd, dollyStart);

                if (dollyDelta.y > 0) {
                    this.dollyIn();
                } else if (dollyDelta.y < 0) {
                    this.dollyOut();
                }
                dollyStart.copy(dollyEnd);
                break;
            case states.PAN:
                panEnd.copy(coords);
                panDelta.subVectors(panEnd, panStart);

                this._mouseToPan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);
                break;
            case states.MOVE_GLOBE: {
                const normalized = view.viewToNormalizedCoords(coords);
                raycaster.setFromCamera(normalized, this.camera);
                const intersection = raycaster.ray.intersectSphere(pickSphere);
                // If there's intersection then move globe else we stop the move
                if (intersection) {
                    normalizedIntersection.copy(intersection).normalize();
                    moveAroundGlobe.setFromUnitVectors(normalizedIntersection, lastNormalizedIntersection);
                    lastTimeMouseMove = Date.now();
                } else {
                    onMouseUp.bind(this)();
                }
                break; }
            default:
        }

        if (state !== states.NONE) {
            update();
        }
    }

    const targetPosition = new THREE.Vector3();
    const pickedPosition = new THREE.Vector3();
    const updateTarget = () => {
        // Update camera's target position
        view.getPickingPositionFromDepth(null, pickedPosition);
        const distance = !isNaN(pickedPosition.x) ? this.camera.position.distanceTo(pickedPosition) : 100;
        targetPosition.set(0, 0, -distance);
        this.camera.localToWorld(targetPosition);

        // set new camera target on globe
        positionObject(targetPosition, cameraTarget);
        cameraTarget.matrixWorldInverse.getInverse(cameraTarget.matrixWorld);
        targetPosition.copy(this.camera.position);
        targetPosition.applyMatrix4(cameraTarget.matrixWorldInverse);
        spherical.setFromVector3(targetPosition);
    };

    function onMouseDown(event) {
        CameraUtils.stop(view, this.camera);
        player.stop().then(() => {
            if (this.enabled === false) return;
            event.preventDefault();

            updateTarget();
            previous = CameraUtils.getTransformCameraLookingAtTarget(view, this.camera);
            state = states.inputToState(event.button, currentKey);

            const coords = view.eventToViewCoords(event);

            switch (state) {
                case states.ORBIT:
                case states.PANORAMIC:
                    rotateStart.copy(coords);
                    break;
                case states.SELECT:
                    // If the key 'S' is down, the view selects node under mouse
                    view.selectNodeAt(coords);
                    break;
                case states.MOVE_GLOBE: {
                    // update picking on sphere
                    if (view.getPickingPositionFromDepth(coords, pickingPoint)) {
                        pickSphere.radius = pickingPoint.length();
                        lastNormalizedIntersection.copy(pickingPoint).normalize();
                        updateHelper.bind(this)(pickingPoint, helpers.picking);
                    } else {
                        state = states.NONE;
                    }
                    break;
                }
                case states.DOLLY:
                    dollyStart.copy(coords);
                    break;
                case states.PAN:
                    panStart.copy(coords);
                    break;
                default:
            }
            if (state != states.NONE) {
                this.domElement.addEventListener('mousemove', _handlerMouseMove, false);
                this.domElement.addEventListener('mouseup', _handlerMouseUp, false);
                this.domElement.addEventListener('mouseleave', _handlerMouseUp, false);
                this.dispatchEvent(this.startEvent);
            }
        });
    }

    function ondblclick(event) {
        if (this.enabled === false || currentKey) return;
        player.stop().then(() => {
            const point = view.getPickingPositionFromDepth(view.eventToViewCoords(event));
            const range = this.getRange();
            if (point && range > this.minDistance) {
                this.lookAtCoordinate({
                    coord: new Coordinates('EPSG:4978', point),
                    range: range * 0.6,
                    time: 1500,
                });
            }
        });
    }

    this._handlingEvent = (current) => {
        current = current || CameraUtils.getTransformCameraLookingAtTarget(view, this.camera);
        const diff = CameraUtils.getDiffParams(previous, current);
        if (diff) {
            if (diff.range) {
                this.dispatchEvent({
                    type: CONTROL_EVENTS.RANGE_CHANGED,
                    previous: diff.range.previous,
                    new: diff.range.new,
                });
            }
            if (diff.coord) {
                this.dispatchEvent({
                    type: CONTROL_EVENTS.CAMERA_TARGET_CHANGED,
                    previous: diff.coord.previous,
                    new: diff.coord.new,
                });
            }
            if (diff.tilt || diff.heading) {
                const event = {
                    type: CONTROL_EVENTS.ORIENTATION_CHANGED,
                };
                if (diff.tilt) {
                    event.previous = { tilt: diff.tilt.previous };
                    event.new = { tilt: diff.tilt.new };
                }

                if (diff.heading) {
                    event.previous = event.previous || {};
                    event.new = event.new || {};
                    event.new.heading = diff.heading.new;
                    event.previous.heading = diff.heading.previous;
                }

                this.dispatchEvent(event);
            }
        }
    };

    this._onEndingMove = (current) => {
        state = states.NONE;
        this._handlingEvent(current);
    };

    function onMouseUp() {
        if (this.enabled === false) return;

        this.domElement.removeEventListener('mousemove', _handlerMouseMove, false);
        this.domElement.removeEventListener('mouseup', _handlerMouseUp, false);
        this.domElement.removeEventListener('mouseleave', _handlerMouseUp, false);
        this.dispatchEvent(this.endEvent);

        player.stop();

        // Launch damping movement for :
        //      * states.ORBIT
        //      * states.MOVE_GLOBE
        if (this.enableDamping) {
            if (state === states.ORBIT && (sphericalDelta.theta > EPS || sphericalDelta.phi > EPS)) {
                player.play(animationDampingOrbital).then(this._onEndingMove);
            } else if (state === states.MOVE_GLOBE && (Date.now() - lastTimeMouseMove < 50)) {
                // animation since mouse up event occurs less than 50ms after the last mouse move
                player.play(animationDampingMove).then(this._onEndingMove);
            } else {
                this._onEndingMove();
            }
        } else {
            this._onEndingMove();
        }
    }

    function onMouseWheel(event) {
        player.stop().then(() => {
            if (!this.enabled || !states.DOLLY.enable) return;
            CameraUtils.stop(view, this.camera);
            event.preventDefault();
            event.stopPropagation();

            updateTarget();
            let delta = 0;

            // WebKit / Opera / Explorer 9
            if (event.wheelDelta !== undefined) {
                delta = event.wheelDelta;
            // Firefox
            } else if (event.detail !== undefined) {
                delta = -event.detail;
            }

            if (delta > 0) {
                this.dollyOut();
            } else if (delta < 0) {
                this.dollyIn();
            }

            const previousRange = this.getRange();
            update();
            const newRange = this.getRange();
            if (Math.abs(newRange - previousRange) / previousRange > 0.001) {
                this.dispatchEvent({
                    type: CONTROL_EVENTS.RANGE_CHANGED,
                    previous: previousRange,
                    new: newRange,
                });
            }
            this.dispatchEvent(this.startEvent);
            this.dispatchEvent(this.endEvent);
        });
    }

    function onKeyUp() {
        if (this.enabled === false || this.enableKeys === false) return;
        currentKey = undefined;
    }

    function onKeyDown(event) {
        player.stop().then(() => {
            if (this.enabled === false || this.enableKeys === false) return;
            currentKey = event.keyCode;
            switch (event.keyCode) {
                case states.PAN.up:
                    this._mouseToPan(0, this.keyPanSpeed);
                    state = states.PAN;
                    update();
                    break;
                case states.PAN.bottom:
                    this._mouseToPan(0, -this.keyPanSpeed);
                    state = states.PAN;
                    update();
                    break;
                case states.PAN.left:
                    this._mouseToPan(this.keyPanSpeed, 0);
                    state = states.PAN;
                    update();
                    break;
                case states.PAN.right:
                    this._mouseToPan(-this.keyPanSpeed, 0);
                    state = states.PAN;
                    update();
                    break;
                default:
            }
        });
    }

    function onTouchStart(event) {
        // CameraUtils.stop(view);
        player.stop().then(() => {
            if (this.enabled === false) return;

            state = states.touchToState(event.touches.length);

            updateTarget();

            if (state !== states.NONE) {
                switch (state) {
                    case states.MOVE_GLOBE: {
                        const coords = view.eventToViewCoords(event);
                        if (view.getPickingPositionFromDepth(coords, pickingPoint)) {
                            pickSphere.radius = pickingPoint.length();
                            lastNormalizedIntersection.copy(pickingPoint).normalize();
                            updateHelper.bind(this)(pickingPoint, helpers.picking);
                        } else {
                            state = states.NONE;
                        }
                        break; }
                    case states.DOLLY: {
                        const dx = event.touches[0].pageX - event.touches[1].pageX;
                        const dy = event.touches[0].pageY - event.touches[1].pageY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        dollyStart.set(0, distance);
                        break; }
                    case states.PAN:
                        panStart.set(event.touches[0].pageX, event.touches[0].pageY);
                        break;
                    default:
                }

                this.dispatchEvent(this.startEvent);
            }
        });
    }

    function onTouchMove(event) {
        if (player.isPlaying()) {
            player.stop();
        }
        if (this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
            case states.MOVE_GLOBE.finger: {
                const coords = view.eventToViewCoords(event);
                const normalized = view.viewToNormalizedCoords(coords);
                raycaster.setFromCamera(normalized, this.camera);
                const intersection = raycaster.ray.intersectSphere(pickSphere);
                // If there's intersection then move globe else we stop the move
                if (intersection) {
                    normalizedIntersection.copy(intersection).normalize();
                    moveAroundGlobe.setFromUnitVectors(normalizedIntersection, lastNormalizedIntersection);
                    lastTimeMouseMove = Date.now();
                } else {
                    onMouseUp.bind(this)();
                }
                break; }
            case states.ORBIT.finger:
            case states.DOLLY.finger: {
                const gfx = view.mainLoop.gfxEngine;
                rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                // rotating across whole screen goes 360 degrees around
                this.rotateLeft(2 * Math.PI * rotateDelta.x / gfx.width * this.rotateSpeed);
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * rotateDelta.y / gfx.height * this.rotateSpeed);

                rotateStart.copy(rotateEnd);
                const dx = event.touches[0].pageX - event.touches[1].pageX;
                const dy = event.touches[0].pageY - event.touches[1].pageY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                dollyEnd.set(0, distance);
                dollyDelta.subVectors(dollyEnd, dollyStart);

                if (dollyDelta.y > 0) {
                    this.dollyOut();
                } else if (dollyDelta.y < 0) {
                    this.dollyIn();
                }

                dollyStart.copy(dollyEnd);

                break; }
            case states.PAN.finger:
                panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                panDelta.subVectors(panEnd, panStart);

                this._mouseToPan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);
                break;
            default:
                state = states.NONE;
        }

        if (state !== states.NONE) {
            update();
        }
    }

    function onTouchEnd(/* event */) {
        onMouseUp.bind(this)();
    }

    this.dispose = function dispose() {
        // this.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
        this.domElement.removeEventListener('mousedown', onMouseDown, false);
        this.domElement.removeEventListener('mousewheel', onMouseWheel, false);
        this.domElement.removeEventListener('DOMMouseScroll', onMouseWheel, false); // firefox

        this.domElement.removeEventListener('touchstart', onTouchStart, false);
        this.domElement.removeEventListener('touchend', onTouchEnd, false);
        this.domElement.removeEventListener('touchmove', onTouchMove, false);

        this.domElement.removeEventListener('mousemove', onMouseMove, false);
        this.domElement.removeEventListener('mouseup', onMouseUp, false);

        window.removeEventListener('keydown', onKeyDown, false);

        this.dispatchEvent({ type: 'dispose' });
    };

    // Instance all
    this.domElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    }, false);
    this.domElement.addEventListener('mousedown', onMouseDown.bind(this), false);
    this.domElement.addEventListener('mousewheel', onMouseWheel.bind(this), false);
    this.domElement.addEventListener('dblclick', ondblclick.bind(this), false);
    this.domElement.addEventListener('DOMMouseScroll', onMouseWheel.bind(this), false); // firefox

    this.domElement.addEventListener('touchstart', onTouchStart.bind(this), false);
    this.domElement.addEventListener('touchend', onTouchEnd.bind(this), false);
    this.domElement.addEventListener('touchmove', onTouchMove.bind(this), false);

    // refresh control for each animation's frame
    player.addEventListener('animation-frame', this.update);

    // TODO: Why windows
    window.addEventListener('keydown', onKeyDown.bind(this), false);
    window.addEventListener('keyup', onKeyUp.bind(this), false);

    // Reset key/mouse when window loose focus
    window.addEventListener('blur', () => {
        onKeyUp.bind(this)();
        onMouseUp.bind(this)();
    });

    view.scene.add(cameraTarget);
    if (enableTargetHelper) {
        cameraTarget.add(helpers.target);
        view.scene.add(helpers.picking);
        const layerTHREEjs = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
        helpers.target.layers.set(layerTHREEjs);
        helpers.picking.layers.set(layerTHREEjs);
        this.camera.layers.enable(layerTHREEjs);
    }

    _handlerMouseMove = onMouseMove.bind(this);
    _handlerMouseUp = onMouseUp.bind(this);

    positionObject(targetCoordinate.as('EPSG:4978').xyz(), cameraTarget);

    this.lookAtCoordinate({
        coord: targetCoordinate,
        tilt: 89.5,
        heading: 0,
        range }, false);
}

GlobeControls.prototype = Object.create(THREE.EventDispatcher.prototype);
GlobeControls.prototype.constructor = GlobeControls;

function getRangeFromScale(scale, pitch, fov, height) {
    // Screen pitch, in millimeters
    pitch = (pitch || 0.28) / 1000;
    fov = THREE.Math.degToRad(fov);
    // Invert one unit projection (see getDollyScale)
    const range = pitch * height / (scale * 2 * Math.tan(fov * 0.5));

    return range;
}

/**
 * Changes the tilt of the current camera, in degrees.
 * @param {number}  tilt
 * @param {boolean} isAnimated
 * @return {Promise<void>}
 */
GlobeControls.prototype.setTilt = function setTilt(tilt, isAnimated) {
    return this.lookAtCoordinate({ tilt }, isAnimated);
};

/**
 * Changes the heading of the current camera, in degrees.
 * @param {number} heading
 * @param {boolean} isAnimated
 * @return {Promise<void>}
 */
GlobeControls.prototype.setHeading = function setHeading(heading, isAnimated) {
    return this.lookAtCoordinate({ heading }, isAnimated);
};

/**
 * Sets the "range": the distance in meters between the camera and the current central point on the screen.
 * @param {number} range
 * @param {boolean} isAnimated
 * @return {Promise<void>}
 */
GlobeControls.prototype.setRange = function setRange(range, isAnimated) {
    return this.lookAtCoordinate({ range }, isAnimated);
};

/**
 * Returns the {@linkcode Coordinates} of the globe point targeted by the camera in EPSG:4978 projection. See {@linkcode Coordinates} for conversion
 * @return {THREE.Vector3} position
 */
GlobeControls.prototype.getCameraTargetPosition = function getCameraTargetPosition() {
    return cameraTarget.position;
};

/**
 * Returns the "range": the distance in meters between the camera and the current central point on the screen.
 * @return {number} number
 */
GlobeControls.prototype.getRange = function getRange() {
    return CameraUtils.getTransformCameraLookingAtTarget(this._view, this.camera).range;
};

/**
 * Returns the tilt of the current camera in degrees.
 * @return {Angle} number - The angle of the rotation in degrees.
 */
GlobeControls.prototype.getTilt = function getTilt() {
    return CameraUtils.getTransformCameraLookingAtTarget(this._view, this.camera).tilt;
};

/**
 * Returns the heading of the current camera in degrees.
 * @return {Angle} number - The angle of the rotation in degrees.
 */
GlobeControls.prototype.getHeading = function getHeading() {
    return CameraUtils.getTransformCameraLookingAtTarget(this._view, this.camera).heading;
};

/**
 * Displaces the central point to a specific amount of pixels from its current position.
 * The view flies to the desired coordinate, i.e.is not teleported instantly. Note : The results can be strange in some cases, if ever possible, when e.g.the camera looks horizontally or if the displaced center would not pick the ground once displaced.
 * @param      {vector}  pVector  The vector
 * @return {Promise}
 */
GlobeControls.prototype.pan = function pan(pVector) {
    this._mouseToPan(pVector.x, pVector.y);
    this.update();
    return Promise.resolve();
};

/**
 * Returns the orientation angles of the current camera, in degrees.
 * @return {Array<number>}
 */
GlobeControls.prototype.getCameraOrientation = function getCameraOrientation() {
    return [this.getTilt(), this.getHeading()];
};

/**
 * Returns the camera location projected on the ground in lat,lon. See {@linkcode Coordinates} for conversion.
 * @return {Coordinates} position
 */

GlobeControls.prototype.getCameraCoordinate = function _getCameraCoordinate() {
    return new Coordinates('EPSG:4978', this.camera.position).as('EPSG:4326');
};

/**
 * @deprecated
 * Returns the {@linkcode Coordinates} of the central point on screen in lat,lon. See {@linkcode Coordinates} for conversion.
 * @return {Position} position
 */
GlobeControls.prototype.getCameraTargetGeoPosition = function getCameraTargetGeoPosition() {
    console.warn('getCameraTargetGeoPosition has been deprecated, use getLookAtCoordinate');
    return this.getLookAtCoordinate();
};

/**
 * Returns the {@linkcode Coordinates} of the central point on screen in lat,lon. See {@linkcode Coordinates} for conversion.
 * @return {Coordinates} coordinate
 */
GlobeControls.prototype.getLookAtCoordinate = function _getLookAtCoordinate() {
    return CameraUtils.getTransformCameraLookingAtTarget(this._view, this.camera).coord;
};

/**
 * Sets the animation enabled.
 * @param      {boolean}  enable  enable
 */
GlobeControls.prototype.setAnimationEnabled = function setAnimationEnabled(enable) {
    enableAnimation = enable;
};

/**
 * Determines if animation enabled.
 * @return     {boolean}  True if animation enabled, False otherwise.
 */
GlobeControls.prototype.isAnimationEnabled = function isAnimationEnabled() {
    return enableAnimation;
};

/**
 * Returns the actual zoom. The zoom will always be between the [getMinZoom(), getMaxZoom()].
 * @return     {number}  The zoom .
 */
GlobeControls.prototype.getZoom = function getZoom() {
    return computeTileZoomFromDistanceCamera(this.getRange(), this._view);
};

/**
 * Sets the current zoom, which is an index in the logical scales predefined for the application.
 * The higher the zoom, the closer to the ground.
 * The zoom is always in the [getMinZoom(), getMaxZoom()] range.
 * @param      {number}  zoom    The zoom
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */
GlobeControls.prototype.setZoom = function setZoom(zoom, isAnimated) {
    return this.lookAtCoordinate({ zoom }, isAnimated);
};

/**
 * Return the current zoom scale at the central point of the view.
 * This function compute the scale of a map
 * @param      {number}  pitch   Screen pitch, in millimeters ; 0.28 by default
 * @return     {number}  The zoom scale.
 */
GlobeControls.prototype.getScale = function getScale(pitch) {
    // TODO: Why error div size height in Chrome?
    // Screen pitch, in millimeters
    pitch = (pitch || 0.28) / 1000;
    const fov = THREE.Math.degToRad(this.camera.fov);
    // projection one unit on screen
    const gfx = this._view.mainLoop.gfxEngine;
    const unitProjection = gfx.height / (2 * this.getRange() * Math.tan(fov * 0.5));
    return pitch * unitProjection;
};

/**
 * To convert the projection in meters on the globe of a number of pixels of screen
 * @param      {number} pixels count pixels to project
 * @param      {number} pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
 * @return     {number} projection in meters on globe
 */
GlobeControls.prototype.pixelsToMeters = function pixelsToMeters(pixels, pixelPitch = 0.28) {
    const scaled = this.getScale(pixelPitch);
    const size = pixels * pixelPitch;
    return size / scaled / 1000;
};

/**
 * To convert the projection a number of horizontal pixels of screen to longitude degree WGS84 on the globe
 * @param      {number} pixels count pixels to project
 * @param      {number} pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
 * @return     {number} projection in degree on globe
 */

GlobeControls.prototype.pixelsToDegrees = function pixelsToDegrees(pixels, pixelPitch = 0.28) {
    const chord = this.pixelsToMeters(pixels, pixelPitch);
    const radius = ellipsoidSizes().x;
    return THREE.Math.radToDeg(2 * Math.asin(chord / (2 * radius)));
};

/**
 * Projection on screen in pixels of length in meter on globe
 * @param      {number}  value Length in meter on globe
 * @param      {number}  pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
 * @return     {number}  projection in pixels on screen
 */
GlobeControls.prototype.metersToPixels = function metersToPixels(value, pixelPitch = 0.28) {
    const scaled = this.getScale(pixelPitch);
    pixelPitch /= 1000;
    return value * scaled / pixelPitch;
};

/**
 * Changes the zoom of the central point of screen so that screen acts as a map with a specified scale.
 *  The view flies to the desired zoom scale;
 * @param      {number}  scale  The scale
 * @param      {number}  pitch  The pitch
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}
 */

GlobeControls.prototype.setScale = function setScale(scale, pitch, isAnimated) {
    return this.lookAtCoordinate({ scale, pitch }, isAnimated);
};

/**
 * @deprecated
 * Changes the center of the scene on screen to the specified in lat, lon. See {@linkcode Coordinates} for conversion.
 * @function
 * @memberOf GlobeControls
 * @param {Object} coordinates - The globe coordinates in EPSG_4326 projection to aim to
 * @param {number} coordinates.latitude
 * @param {number} coordinates.longitude
 * @param {number} coordinates.range
 * @param {boolean}  isAnimated - if the movement should be animated
 * @return {Promise} A promise that resolves when the next 'globe initilazed' event fires.
 */
GlobeControls.prototype.setCameraTargetGeoPosition = function setCameraTargetGeoPosition(coordinates, isAnimated) {
    console.warn('setCameraTargetGeoPosition has been deprecated, use lookAtCoordinate');
    return this.lookAtCoordinate(new Coordinates('EPSG:4326', coordinates.longitude, coordinates.latitude, 0), isAnimated);
};

/**
 * Changes the center of the scene on screen to the specified in lat, lon. See {@linkcode Coordinates} for conversion.
 * This function allows to change the central position, the zoom, the range, the scale and the camera orientation at the same time.
 * The zoom has to be between the [getMinZoom(), getMaxZoom()].
 * Zoom parameter is ignored if range is set
 * The tilt's interval is between 4 and 89.5 degree
 *
 * @param      {cameraTransformOptions}   params camera transformation to apply
 * @param      {number}   [params.zoom]   zoom
 * @param      {number}   [params.scale]   scale
 * @param      {boolean}  isAnimated  Indicates if animated
 * @return     {Promise}  A promise that resolves when transformation is oppered
 */
GlobeControls.prototype.lookAtCoordinate = function _lookAtCoordinate(params = {}, isAnimated = this.isAnimationEnabled()) {
    if (params.zoom) {
        params.range = computeDistanceCameraFromTileZoom(params.zoom, this._view);
    } else if (params.scale) {
        const gfx = this._view.mainLoop.gfxEngine;
        params.range = getRangeFromScale(params.scale, params.pitch, this.camera.fov, gfx.height);
        if (params.range < this.minDistance || params.range > this.maxDistance) {
            // eslint-disable-next-line no-console
            console.warn(`This scale ${params.scale} can not be reached`);
            params.range = THREE.Math.clamp(params.range, this.minDistance, this.maxDistance);
        }
    }

    if (params.tilt !== undefined) {
        const minTilt = 90 - THREE.Math.radToDeg(this.maxPolarAngle);
        const maxTilt = 90 - THREE.Math.radToDeg(this.minPolarAngle);
        if (params.tilt < minTilt || params.tilt > maxTilt) {
            params.tilt = THREE.Math.clamp(params.tilt, minTilt, maxTilt);
            // eslint-disable-next-line no-console
            console.warn('Tilt was clamped to ', params.tilt, ` the interval is between ${minTilt} and ${maxTilt} degree`);
        }
    }

    previous = CameraUtils.getTransformCameraLookingAtTarget(this._view, this.camera);
    if (isAnimated) {
        params.callback = r => cameraTarget.position.copy(r.targetWorldPosition);
        this.dispatchEvent({ type: 'animation-started' });
        return CameraUtils.animateCameraToLookAtTarget(this._view, this.camera, params)
            .then((result) => {
                this.dispatchEvent({ type: 'animation-ended' });
                this._handlingEvent(result);
                return result;
            });
    } else {
        return CameraUtils.transformCameraToLookAtTarget(this._view, this.camera, params).then((result) => {
            cameraTarget.position.copy(result.targetWorldPosition);
            this._handlingEvent(result);
            return result;
        });
    }
};

/**
 * @deprecated
 * Changes the center of the scene on screen to the specified in lat, lon. See {@linkcode Coordinates} for conversion.
 * This function allows to change the central position, the zoom, the range, the scale and the camera orientation at the same time.
 * The zoom has to be between the [getMinZoom(), getMaxZoom()].
 * Zoom parameter is ignored if range is set
 * @param {Position} position
 * @param {number}  position.longitude  Coordinate longitude WGS84 in degree
 * @param {number}  position.latitude  Coordinate latitude WGS84 in degree
 * @param {number}  [position.tilt]  Camera tilt in degree
 * @param {number}  [position.heading]  Camera heading in degree
 * @param {number}  [position.range]  The camera distance to the target center
 * @param {number}  [position.zoom]  zoom,  ignored if range is set
 * @param {number}  [position.scale]  scale,  ignored if the zoom or range is set. For a scale of 1/500 it is necessary to write 0,002.
 * @param {boolean}  isAnimated  Indicates if animated
 * @return {Promise}
 */

GlobeControls.prototype.setCameraTargetGeoPositionAdvanced = function setCameraTargetGeoPositionAdvanced(position, isAnimated) {
    console.warn('setCameraTargetGeoPositionAdvanced has been deprecated, use lookAtCoordinate');
    position.coord = new Coordinates('EPSG:4326', position.longitude, position.latitude, 0);
    return this.lookAtCoordinate(position, isAnimated);
};

/**
 * @deprecated
 * Sets orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="http://jsfiddle.net/iTownsIGN/9qr2mogh/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @param {{tilt:number,heading:number,range:number}} position
 * @param {boolean}  isAnimated
 * @return {Promise} A promise that resolves when transformation is oppered
 */
GlobeControls.prototype.setOrbitalPosition = function setOrbitalPosition(position, isAnimated) {
    console.warn('setOrbitalPosition has been deprecated, use lookAtCoordinate');
    return this.lookAtCoordinate(position, isAnimated);
};

/**
 * Pick a position on the globe at the given position in lat,lon. See {@linkcode Coordinates} for conversion.
 * @param {Vector2} windowCoords - window coordinates
 * @param {number=} y - The y-position inside the Globe element.
 * @return {Coordinates} position
 */
GlobeControls.prototype.pickGeoPosition = function pickGeoPosition(windowCoords) {
    const pickedPosition = this._view.getPickingPositionFromDepth(windowCoords);

    if (!pickedPosition) {
        return;
    }

    return new Coordinates('EPSG:4978', pickedPosition).as('EPSG:4326');
};

export default GlobeControls;
