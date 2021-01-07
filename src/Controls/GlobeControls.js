import * as THREE from 'three';
import AnimationPlayer from 'Core/AnimationPlayer';
import Coordinates from 'Core/Geographic/Coordinates';
import { ellipsoidSizes } from 'Core/Math/Ellipsoid';
import CameraUtils from 'Utils/CameraUtils';
import StateControl from 'Controls/StateControl';

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
    xyz.setFromVector3(newPosition).as('EPSG:4326', c);
    object.position.copy(newPosition);
    object.lookAt(c.geodesicNormal.add(newPosition));
    object.rotateX(Math.PI * 0.5);
    object.updateMatrixWorld(true);
}

// Save the last time of mouse move for damping
let lastTimeMouseMove = 0;

// Animations and damping
let enableAnimation = true;
const dampingFactorDefault = 0.25;
const dampingMove = new THREE.Quaternion(0, 0, 0, 1);
const durationDampingMove = 120;
const durationDampingOrbital = 60;

// Pan Move
const panVector = new THREE.Vector3();

// Save last transformation
const lastPosition = new THREE.Vector3();
const lastQuaternion = new THREE.Quaternion();

// Tangent sphere to ellipsoid
const pickSphere = new THREE.Sphere();
const pickingPoint = new THREE.Vector3();

// Sphere intersection
const intersection = new THREE.Vector3();

// Set to true to enable target helper
const enableTargetHelper = false;
const helpers = {};

if (enableTargetHelper) {
    helpers.picking = new THREE.AxesHelper(500000);
    helpers.target = new THREE.AxesHelper(500000);
}

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

const quaterPano = new THREE.Quaternion();
const quaterAxis = new THREE.Quaternion();
const axisX = new THREE.Vector3(1, 0, 0);
let minDistanceZ = Infinity;
const lastNormalizedIntersection = new THREE.Vector3();
const normalizedIntersection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const targetPosition = new THREE.Vector3();
const pickedPosition = new THREE.Vector3();
const sphereCamera = new THREE.Sphere();

let previous;
/**
 * GlobeControls is a camera controller
 *
 * @class      GlobeControls
 * @param      {GlobeView}  view the view where the control will be used
 * @param      {CameraTransformOptions}  targetCoordinate the target looked by camera, at initialization
 * @param      {number}  range distance between the target looked and camera, at initialization
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
class GlobeControls extends THREE.EventDispatcher {
    constructor(view, placement, options = {}) {
        super();
        this.player = new AnimationPlayer();
        this.view = view;
        this.camera = view.camera.camera3D;

        // State control
        this.states = new StateControl();
        this.state = this.states.NONE;

        // Set to false to disable this control
        this.enabled = true;

        // This option actually enables dollying in and out; left as "zoom" for
        // backwards compatibility
        this.zoomSpeed = options.zoomSpeed || 2.0;

        // Limits to how far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = options.minDistance || 250;
        this.maxDistance = options.maxDistance || ellipsoidSizes.x * 8.0;

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
        this.minPolarAngle = THREE.MathUtils.degToRad(0.5); // radians
        this.maxPolarAngle = THREE.MathUtils.degToRad(86); // radians

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
        this.dampingMoveFactor = options.dampingMoveFactor != undefined ? options.dampingMoveFactor : dampingFactorDefault;

        this.startEvent = {
            type: 'start',
        };
        this.endEvent = {
            type: 'end',
        };
        // Update helper
        this.updateHelper = enableTargetHelper ? (position, helper) => {
            positionObject(position, helper);
            view.notifyChange(this.camera);
        } : function empty() {};

        this._onEndingMove = null;
        this._onMouseMove = this.onMouseMove.bind(this);
        this._onMouseUp = this.onMouseUp.bind(this);
        this._onMouseDown = this.onMouseDown.bind(this);
        this._onMouseWheel = this.onMouseWheel.bind(this);
        this._onContextMenuListener = this.onContextMenuListener.bind(this);
        this._ondblclick = this.ondblclick.bind(this);
        this._onTouchStart = this.onTouchStart.bind(this);
        this._update = this.update.bind(this);
        this._onTouchMove = this.onTouchMove.bind(this);
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onBlurListener = this.onBlurListener.bind(this);

        this.view.domElement.addEventListener('contextmenu', this._onContextMenuListener, false);
        this.view.domElement.addEventListener('mousedown', this._onMouseDown, false);
        this.view.domElement.addEventListener('mousewheel', this._onMouseWheel, false);
        this.view.domElement.addEventListener('dblclick', this._ondblclick, false);
        this.view.domElement.addEventListener('DOMMouseScroll', this._onMouseWheel, false); // firefox
        this.view.domElement.addEventListener('touchstart', this._onTouchStart, false);
        this.view.domElement.addEventListener('touchend', this._onMouseUp, false);
        this.view.domElement.addEventListener('touchmove', this._onTouchMove, false);

        // refresh control for each animation's frame
        this.player.addEventListener('animation-frame', this._update);

        // TODO: Why windows
        window.addEventListener('keydown', this._onKeyDown, false);
        window.addEventListener('keyup', this._onKeyUp, false);

        // Reset key/mouse when window loose focus
        window.addEventListener('blur', this._onBlurListener);

        view.scene.add(cameraTarget);
        if (enableTargetHelper) {
            cameraTarget.add(helpers.target);
            view.scene.add(helpers.picking);
            const layerTHREEjs = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
            helpers.target.layers.set(layerTHREEjs);
            helpers.picking.layers.set(layerTHREEjs);
            this.camera.layers.enable(layerTHREEjs);
        }

        positionObject(placement.coord.as('EPSG:4978', xyz), cameraTarget);

        placement.tilt = placement.tilt || 89.5;
        placement.heading = placement.heading || 0;
        this.lookAtCoordinate(placement, false);
    }

    get dollyScale() {
        return 0.95 ** this.zoomSpeed;
    }

    get isPaused() {
        return this.state == this.states.NONE;
    }

    onEndingMove(current) {
        if (this._onEndingMove) {
            this.player.removeEventListener('animation-stopped', this._onEndingMove);
            this._onEndingMove = null;
        }
        this.state = this.states.NONE;
        this.handlingEvent(current);
    }

    rotateLeft(angle = 0) {
        sphericalDelta.theta -= angle;
    }

    rotateUp(angle = 0) {
        sphericalDelta.phi -= angle;
    }

    // pass in distance in world space to move left
    panLeft(distance) {
        const te = this.camera.matrix.elements;
        // get X column of matrix
        panOffset.fromArray(te);
        panOffset.multiplyScalar(-distance);
        panVector.add(panOffset);
    }

    // pass in distance in world space to move up
    panUp(distance) {
        const te = this.camera.matrix.elements;
        // get Y column of matrix
        panOffset.fromArray(te, 4);
        panOffset.multiplyScalar(distance);
        panVector.add(panOffset);
    }

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    mouseToPan(deltaX, deltaY) {
        const gfx = this.view.mainLoop.gfxEngine;
        this.state = this.states.PAN;
        if (this.camera.isPerspectiveCamera) {
            let targetDistance = this.camera.position.distanceTo(this.getCameraTargetPosition());
            // half of the fov is center to top of screen
            targetDistance *= 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(deltaX * targetDistance / gfx.width * this.camera.aspect);
            this.panUp(deltaY * targetDistance / gfx.height);
        } else if (this.camera.isOrthographicCamera) {
            // orthographic
            this.panLeft(deltaX * (this.camera.right - this.camera.left) / gfx.width);
            this.panUp(deltaY * (this.camera.top - this.camera.bottom) / gfx.height);
        }
    }

    dollyIn(dollyScale) {
        if (dollyScale === undefined) {
            dollyScale = this.dollyScale;
        }

        if (this.camera.isPerspectiveCamera) {
            orbitScale /= dollyScale;
        } else if (this.camera.isOrthographicCamera) {
            this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * dollyScale, this.minZoom, this.maxZoom);
            this.camera.updateProjectionMatrix();
            this.view.notifyChange(this.camera);
        }
    }

    dollyOut(dollyScale) {
        if (dollyScale === undefined) {
            dollyScale = this.dollyScale;
        }

        if (this.camera.isPerspectiveCamera) {
            orbitScale *= dollyScale;
        } else if (this.camera.isOrthographicCamera) {
            this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom / dollyScale, this.minZoom, this.maxZoom);
            this.camera.updateProjectionMatrix();
            this.view.notifyChange(this.camera);
        }
    }

    getMinDistanceCameraBoundingSphereObbsUp(tile) {
        if (tile.level > 10 && tile.children.length == 1 && tile.geometry) {
            const obb = tile.obb;
            sphereCamera.center.copy(this.camera.position);
            sphereCamera.radius = this.minDistanceCollision;
            if (obb.isSphereAboveXYBox(sphereCamera)) {
                minDistanceZ = Math.min(sphereCamera.center.z - obb.box3D.max.z, minDistanceZ);
            }
        }
    }

    update() {
        // We compute distance between camera's bounding sphere and geometry's obb up face
        minDistanceZ = Infinity;
        if (this.handleCollision) { // We check distance to the ground/surface geometry
            // add minDistanceZ between camera's bounding and tiles's oriented bounding box (up face only)
            // Depending on the distance of the camera with obbs, we add a slowdown or constrain to the movement.
            // this constraint or deceleration is suitable for two types of movement MOVE_GLOBE and ORBIT.
            // This constraint or deceleration inversely proportional to the camera/obb distance
            if (this.view.tileLayer) {
                for (const tile of this.view.tileLayer.level0Nodes) {
                    tile.traverse(this.getMinDistanceCameraBoundingSphereObbsUp.bind(this));
                }
            }
        }
        switch (this.state) {
            // MOVE_GLOBE Rotate globe with mouse
            case this.states.MOVE_GLOBE:
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
            case this.states.PAN:
                this.camera.position.add(panVector);
                cameraTarget.position.add(panVector);
                break;
            // PANORAMIC Move target camera
            case this.states.PANORAMIC: {
                this.camera.worldToLocal(cameraTarget.position);
                const normal = this.camera.position.clone().normalize().applyQuaternion(this.camera.quaternion.clone().invert());
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

                if (this.handleCollision) {
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
                        contraryPhi = THREE.MathUtils.clamp(contraryPhi, minContraintPhi, 0);
                        // the deeper the camera is in this zone, the bigger the factor is
                        const contraryFactor = 1 - (contraryLimit - minDistanceZ) / contraryZone;
                        sphericalDelta.phi = THREE.MathUtils.lerp(sphericalDelta.phi, contraryPhi, contraryFactor);
                        minDistanceZ -= Math.sin(sphericalDelta.phi) * spherical.radius;
                    }
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
            sphericalDelta.theta *= (1 - dampingFactorDefault);
            sphericalDelta.phi *= (1 - dampingFactorDefault);
            moveAroundGlobe.slerp(dampingMove, this.dampingMoveFactor * 0.2);
        }

        orbitScale = 1;
        panVector.set(0, 0, 0);

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8
        if (lastPosition.distanceToSquared(this.camera.position) > EPS || 8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS) {
            this.view.notifyChange(this.camera);

            lastPosition.copy(this.camera.position);
            lastQuaternion.copy(this.camera.quaternion);
        }
        // Launch animationdamping if mouse stops these movements
        if (this.enableDamping && this.state === this.states.ORBIT && this.player.isStopped() && (sphericalDelta.theta > EPS || sphericalDelta.phi > EPS)) {
            this.player.playLater(durationDampingOrbital, 2);
        }
    }

    onMouseMove(event) {
        if (this.player.isPlaying()) {
            this.player.stop();
        }
        if (this.enabled === false) { return; }

        event.preventDefault();
        const coords = this.view.eventToViewCoords(event);

        switch (this.state) {
            case this.states.ORBIT:
            case this.states.PANORAMIC: {
                rotateEnd.copy(coords);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                const gfx = this.view.mainLoop.gfxEngine;
                this.rotateLeft(2 * Math.PI * rotateDelta.x / gfx.width * this.rotateSpeed);
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * rotateDelta.y / gfx.height * this.rotateSpeed);

                rotateStart.copy(rotateEnd);
                break; }
            case this.states.DOLLY:
                dollyEnd.copy(coords);
                dollyDelta.subVectors(dollyEnd, dollyStart);

                if (dollyDelta.y > 0) {
                    this.dollyIn();
                } else if (dollyDelta.y < 0) {
                    this.dollyOut();
                }
                dollyStart.copy(dollyEnd);
                break;
            case this.states.PAN:
                panEnd.copy(coords);
                panDelta.subVectors(panEnd, panStart);

                this.mouseToPan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);
                break;
            case this.states.MOVE_GLOBE: {
                const normalized = this.view.viewToNormalizedCoords(coords);
                raycaster.setFromCamera(normalized, this.camera);
                // If there's intersection then move globe else we stop the move
                if (raycaster.ray.intersectSphere(pickSphere, intersection)) {
                    normalizedIntersection.copy(intersection).normalize();
                    moveAroundGlobe.setFromUnitVectors(normalizedIntersection, lastNormalizedIntersection);
                    lastTimeMouseMove = Date.now();
                } else {
                    this.onMouseUp();
                }
                break; }
            default:
        }

        if (this.state !== this.states.NONE) {
            this.update();
        }
    }

    updateTarget() {
        // Update camera's target position
        this.view.getPickingPositionFromDepth(null, pickedPosition);
        const distance = !isNaN(pickedPosition.x) ? this.camera.position.distanceTo(pickedPosition) : 100;
        targetPosition.set(0, 0, -distance);
        this.camera.localToWorld(targetPosition);

        // set new camera target on globe
        positionObject(targetPosition, cameraTarget);
        cameraTarget.matrixWorldInverse.copy(cameraTarget.matrixWorld).invert();
        targetPosition.copy(this.camera.position);
        targetPosition.applyMatrix4(cameraTarget.matrixWorldInverse);
        spherical.setFromVector3(targetPosition);
    }

    handlingEvent(current) {
        current = current || CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera);
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
    }

    onMouseDown(event) {
        CameraUtils.stop(this.view, this.camera);
        this.player.stop();
        this.onEndingMove();
        if (this.enabled === false) { return; }

        this.updateTarget();
        previous = CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, pickedPosition);
        this.state = this.states.inputToState(event.button, currentKey);

        const coords = this.view.eventToViewCoords(event);

        switch (this.state) {
            case this.states.ORBIT:
            case this.states.PANORAMIC:
                rotateStart.copy(coords);
                break;
            case this.states.MOVE_GLOBE: {
                // update picking on sphere
                if (this.view.getPickingPositionFromDepth(coords, pickingPoint)) {
                    pickSphere.radius = pickingPoint.length();
                    lastNormalizedIntersection.copy(pickingPoint).normalize();
                    this.updateHelper(pickingPoint, helpers.picking);
                } else {
                    this.state = this.states.NONE;
                }
                break;
            }
            case this.states.DOLLY:
                dollyStart.copy(coords);
                break;
            case this.states.PAN:
                panStart.copy(coords);
                break;
            default:
        }
        if (this.state != this.states.NONE) {
            this.view.domElement.addEventListener('mousemove', this._onMouseMove, false);
            this.view.domElement.addEventListener('mouseup', this._onMouseUp, false);
            this.view.domElement.addEventListener('mouseleave', this._onMouseUp, false);
            this.dispatchEvent(this.startEvent);
        }
    }

    ondblclick(event) {
        if (this.enabled === false || currentKey) { return; }
        this.player.stop();
        const point = this.view.getPickingPositionFromDepth(this.view.eventToViewCoords(event));
        const range = this.getRange(point);
        if (point && range > this.minDistance) {
            return this.lookAtCoordinate({
                coord: new Coordinates('EPSG:4978', point),
                range: range * 0.6,
                time: 1500,
            });
        }
    }

    onMouseUp() {
        if (this.enabled === false) { return; }

        this.view.domElement.removeEventListener('mousemove', this._onMouseMove, false);
        this.view.domElement.removeEventListener('mouseup', this._onMouseUp, false);
        this.view.domElement.removeEventListener('mouseleave', this._onMouseUp, false);
        this.dispatchEvent(this.endEvent);

        this.player.stop();

        // Launch damping movement for :
        //      * this.states.ORBIT
        //      * this.states.MOVE_GLOBE
        if (this.enableDamping) {
            if (this.state === this.states.ORBIT && (sphericalDelta.theta > EPS || sphericalDelta.phi > EPS)) {
                this.player.play(durationDampingOrbital);
                this._onEndingMove = () => this.onEndingMove();
                this.player.addEventListener('animation-stopped', this._onEndingMove);
            } else if (this.state === this.states.MOVE_GLOBE && (Date.now() - lastTimeMouseMove < 50)) {
                // animation since mouse up event occurs less than 50ms after the last mouse move
                this.player.play(durationDampingMove);
                this._onEndingMove = () => this.onEndingMove();
                this.player.addEventListener('animation-stopped', this._onEndingMove);
            } else {
                this.onEndingMove();
            }
        } else {
            this.onEndingMove();
        }
    }

    onMouseWheel(event) {
        this.player.stop();
        if (!this.enabled || !this.states.DOLLY.enable) { return; }
        CameraUtils.stop(this.view, this.camera);
        event.preventDefault();

        this.updateTarget();
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

        const previousRange = this.getRange(pickedPosition);
        this.update();
        const newRange = this.getRange(pickedPosition);
        if (Math.abs(newRange - previousRange) / previousRange > 0.001) {
            this.dispatchEvent({
                type: CONTROL_EVENTS.RANGE_CHANGED,
                previous: previousRange,
                new: newRange,
            });
        }
        this.dispatchEvent(this.startEvent);
        this.dispatchEvent(this.endEvent);
    }

    onKeyUp() {
        if (this.enabled === false || this.enableKeys === false) { return; }
        currentKey = undefined;
    }

    onKeyDown(event) {
        this.player.stop();
        if (this.enabled === false || this.enableKeys === false) { return; }
        currentKey = event.keyCode;
        switch (event.keyCode) {
            case this.states.PAN.up:
                this.mouseToPan(0, this.keyPanSpeed);
                this.state = this.states.PAN;
                this.update();
                break;
            case this.states.PAN.bottom:
                this.mouseToPan(0, -this.keyPanSpeed);
                this.state = this.states.PAN;
                this.update();
                break;
            case this.states.PAN.left:
                this.mouseToPan(this.keyPanSpeed, 0);
                this.state = this.states.PAN;
                this.update();
                break;
            case this.states.PAN.right:
                this.mouseToPan(-this.keyPanSpeed, 0);
                this.state = this.states.PAN;
                this.update();
                break;
            default:
        }
    }

    onTouchStart(event) {
        // CameraUtils.stop(view);
        this.player.stop();
        if (this.enabled === false) { return; }

        this.state = this.states.touchToState(event.touches.length);

        this.updateTarget();

        if (this.state !== this.states.NONE) {
            switch (this.state) {
                case this.states.MOVE_GLOBE: {
                    const coords = this.view.eventToViewCoords(event);
                    if (this.view.getPickingPositionFromDepth(coords, pickingPoint)) {
                        pickSphere.radius = pickingPoint.length();
                        lastNormalizedIntersection.copy(pickingPoint).normalize();
                        this.updateHelper(pickingPoint, helpers.picking);
                    } else {
                        this.state = this.states.NONE;
                    }
                    break; }
                case this.states.ORBIT:
                case this.states.DOLLY: {
                    const x = event.touches[0].pageX;
                    const y = event.touches[0].pageY;
                    const dx = x - event.touches[1].pageX;
                    const dy = y - event.touches[1].pageY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    dollyStart.set(0, distance);
                    rotateStart.set(x, y);
                    break; }
                case this.states.PAN:
                    panStart.set(event.touches[0].pageX, event.touches[0].pageY);
                    break;
                default:
            }

            this.dispatchEvent(this.startEvent);
        }
    }

    onTouchMove(event) {
        if (this.player.isPlaying()) {
            this.player.stop();
        }
        if (this.enabled === false) { return; }

        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
            case this.states.MOVE_GLOBE.finger: {
                const coords = this.view.eventToViewCoords(event);
                const normalized = this.view.viewToNormalizedCoords(coords);
                raycaster.setFromCamera(normalized, this.camera);
                // If there's intersection then move globe else we stop the move
                if (raycaster.ray.intersectSphere(pickSphere, intersection)) {
                    normalizedIntersection.copy(intersection).normalize();
                    moveAroundGlobe.setFromUnitVectors(normalizedIntersection, lastNormalizedIntersection);
                    lastTimeMouseMove = Date.now();
                } else {
                    this.onMouseUp.bind(this)();
                }
                break; }
            case this.states.ORBIT.finger:
            case this.states.DOLLY.finger: {
                const gfx = this.view.mainLoop.gfxEngine;
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
            case this.states.PAN.finger:
                panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                panDelta.subVectors(panEnd, panStart);

                this.mouseToPan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);
                break;
            default:
                this.state = this.states.NONE;
        }

        if (this.state !== this.states.NONE) {
            this.update();
        }
    }

    onContextMenuListener(event) {
        event.preventDefault();
    }

    onBlurListener() {
        this.onKeyUp();
        this.onMouseUp();
    }

    dispose() {
        this.view.domElement.removeEventListener('contextmenu', this._onContextMenuListener, false);

        this.view.domElement.removeEventListener('mousedown', this._onMouseDown, false);
        this.view.domElement.removeEventListener('mousemove', this._onMouseMove, false);
        this.view.domElement.removeEventListener('mousewheel', this._onMouseWheel, false);
        this.view.domElement.removeEventListener('DOMMouseScroll', this._onMouseWheel, false); // firefox
        this.view.domElement.removeEventListener('mouseup', this._onMouseUp, false);
        this.view.domElement.removeEventListener('mouseleave', this._onMouseUp, false);
        this.view.domElement.removeEventListener('dblclick', this._ondblclick, false);

        this.view.domElement.removeEventListener('touchstart', this._onTouchStart, false);
        this.view.domElement.removeEventListener('touchend', this._onMouseUp, false);
        this.view.domElement.removeEventListener('touchmove', this._onTouchMove, false);

        this.player.removeEventListener('animation-frame', this._onKeyUp);

        window.removeEventListener('keydown', this._onKeyDown, false);
        window.removeEventListener('keyup', this._onKeyUp, false);

        window.removeEventListener('blur', this._onBlurListener);

        this.dispatchEvent({ type: 'dispose' });
    }
    /**
     * Changes the tilt of the current camera, in degrees.
     * @param {number}  tilt
     * @param {boolean} isAnimated
     * @return {Promise<void>}
     */
    setTilt(tilt, isAnimated) {
        return this.lookAtCoordinate({ tilt }, isAnimated);
    }

    /**
     * Changes the heading of the current camera, in degrees.
     * @param {number} heading
     * @param {boolean} isAnimated
     * @return {Promise<void>}
     */
    setHeading(heading, isAnimated) {
        return this.lookAtCoordinate({ heading }, isAnimated);
    }

    /**
     * Sets the "range": the distance in meters between the camera and the current central point on the screen.
     * @param {number} range
     * @param {boolean} isAnimated
     * @return {Promise<void>}
     */
    setRange(range, isAnimated) {
        return this.lookAtCoordinate({ range }, isAnimated);
    }

    /**
     * Returns the {@linkcode Coordinates} of the globe point targeted by the camera in EPSG:4978 projection. See {@linkcode Coordinates} for conversion
     * @return {THREE.Vector3} position
     */
    getCameraTargetPosition() {
        return cameraTarget.position;
    }

    /**
     * Returns the "range": the distance in meters between the camera and the current central point on the screen.
     * @param {THREE.Vector3} [position] - The position to consider as picked on
     * the ground.
     * @return {number} number
     */
    getRange(position) {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, position).range;
    }

    /**
     * Returns the tilt of the current camera in degrees.
     * @param {THREE.Vector3} [position] - The position to consider as picked on
     * the ground.
     * @return {number} The angle of the rotation in degrees.
     */
    getTilt(position) {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, position).tilt;
    }

    /**
     * Returns the heading of the current camera in degrees.
     * @param {THREE.Vector3} [position] - The position to consider as picked on
     * the ground.
     * @return {number} The angle of the rotation in degrees.
     */
    getHeading(position) {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera, position).heading;
    }

    /**
     * Displaces the central point to a specific amount of pixels from its current position.
     * The view flies to the desired coordinate, i.e.is not teleported instantly. Note : The results can be strange in some cases, if ever possible, when e.g.the camera looks horizontally or if the displaced center would not pick the ground once displaced.
     * @param      {vector}  pVector  The vector
     * @return {Promise}
     */
    pan(pVector) {
        this.mouseToPan(pVector.x, pVector.y);
        this.update();
        return Promise.resolve();
    }

    /**
     * Returns the orientation angles of the current camera, in degrees.
     * @return {Array<number>}
     */
    getCameraOrientation() {
        this.view.getPickingPositionFromDepth(null, pickedPosition);
        return [this.getTilt(pickedPosition), this.getHeading(pickedPosition)];
    }

    /**
     * Returns the camera location projected on the ground in lat,lon. See {@linkcode Coordinates} for conversion.
     * @return {Coordinates} position
     */

    getCameraCoordinate() {
        return new Coordinates('EPSG:4978', this.camera.position).as('EPSG:4326');
    }

    /**
     * Returns the {@linkcode Coordinates} of the central point on screen in lat,lon. See {@linkcode Coordinates} for conversion.
     * @return {Coordinates} coordinate
     */
    getLookAtCoordinate() {
        return CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera).coord;
    }

    /**
     * Sets the animation enabled.
     * @param      {boolean}  enable  enable
     */
    setAnimationEnabled(enable) {
        enableAnimation = enable;
    }

    /**
     * Determines if animation enabled.
     * @return     {boolean}  True if animation enabled, False otherwise.
     */
    isAnimationEnabled() {
        return enableAnimation;
    }

    /**
     * Returns the actual zoom. The zoom will always be between the [getMinZoom(), getMaxZoom()].
     * @return     {number}  The zoom .
     */
    getZoom() {
        return this.view.tileLayer.computeTileZoomFromDistanceCamera(this.getRange(), this.view.camera);
    }

    /**
     * Sets the current zoom, which is an index in the logical scales predefined for the application.
     * The higher the zoom, the closer to the ground.
     * The zoom is always in the [getMinZoom(), getMaxZoom()] range.
     * @param      {number}  zoom    The zoom
     * @param      {boolean}  isAnimated  Indicates if animated
     * @return     {Promise}
     */
    setZoom(zoom, isAnimated) {
        return this.lookAtCoordinate({ zoom }, isAnimated);
    }

    /**
     * Return the current zoom scale at the central point of the view.
     * This function compute the scale of a map
     * @param      {number}  pitch   Screen pitch, in millimeters ; 0.28 by default
     * @return     {number}  The zoom scale.
     *
     * @deprecated Use View#getScale instead.
     */
    getScale(pitch) /* istanbul ignore next */ {
        console.warn('Deprecated, use View#getScale instead.');
        return this.view.getScale(pitch);
    }

    /**
     * To convert the projection in meters on the globe of a number of pixels of screen
     * @param      {number} pixels count pixels to project
     * @param      {number} pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
     * @return     {number} projection in meters on globe
     *
     * @deprecated Use `View#getPixelsToMeters` instead.
     */
    pixelsToMeters(pixels, pixelPitch = 0.28) /* istanbul ignore next */ {
        console.warn('Deprecated use View#getPixelsToMeters instead.');
        const scaled = this.getScale(pixelPitch);
        const size = pixels * pixelPitch;
        return size / scaled / 1000;
    }

    /**
     * To convert the projection a number of horizontal pixels of screen to longitude degree WGS84 on the globe
     * @param      {number} pixels count pixels to project
     * @param      {number} pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
     * @return     {number} projection in degree on globe
     *
     * @deprecated Use `View#getPixelsToMeters` and `GlobeControls#metersToDegrees`
     * instead.
     */
    pixelsToDegrees(pixels, pixelPitch = 0.28) /* istanbul ignore next */ {
        console.warn('Deprecated, use View#getPixelsToMeters and GlobeControls#getMetersToDegrees instead.');
        const chord = this.pixelsToMeters(pixels, pixelPitch);
        return THREE.MathUtils.radToDeg(2 * Math.asin(chord / (2 * ellipsoidSizes.x)));
    }

    /**
     * Projection on screen in pixels of length in meter on globe
     * @param      {number}  value Length in meter on globe
     * @param      {number}  pixelPitch Screen pixel pitch, in millimeters (default = 0.28 mm / standard pixel size of 0.28 millimeters as defined by the OGC)
     * @return     {number}  projection in pixels on screen
     *
     * @deprecated Use `View#getMetersToPixels` instead.
     */
    metersToPixels(value, pixelPitch = 0.28) /* istanbul ignore next */ {
        console.warn('Deprecated, use View#getMetersToPixels instead.');
        const scaled = this.getScale(pixelPitch);
        pixelPitch /= 1000;
        return value * scaled / pixelPitch;
    }

    /**
     * Changes the zoom of the central point of screen so that screen acts as a map with a specified scale.
     *  The view flies to the desired zoom scale;
     * @param      {number}  scale  The scale
     * @param      {number}  pitch  The pitch
     * @param      {boolean}  isAnimated  Indicates if animated
     * @return     {Promise}
     */
    setScale(scale, pitch, isAnimated) {
        return this.lookAtCoordinate({ scale, pitch }, isAnimated);
    }

    /**
     * Changes the center of the scene on screen to the specified in lat, lon. See {@linkcode Coordinates} for conversion.
     * This function allows to change the central position, the zoom, the range, the scale and the camera orientation at the same time.
     * The zoom has to be between the [getMinZoom(), getMaxZoom()].
     * Zoom parameter is ignored if range is set
     * The tilt's interval is between 4 and 89.5 degree
     *
     * @param      {CameraUtils~CameraTransformOptions}   params camera transformation to apply
     * @param      {number}   [params.zoom]   zoom
     * @param      {number}   [params.scale]   scale
     * @param      {boolean}  isAnimated  Indicates if animated
     * @return     {Promise}  A promise that resolves when transformation is oppered
     */
    lookAtCoordinate(params = {}, isAnimated = this.isAnimationEnabled()) {
        if (params.zoom) {
            params.range = this.view.tileLayer.computeDistanceCameraFromTileZoom(params.zoom, this.view.camera);
        } else if (params.scale) {
            params.range = this.view.getScaleFromDistance(params.pitch, params.scale);
            if (params.range < this.minDistance || params.range > this.maxDistance) {
                // eslint-disable-next-line no-console
                console.warn(`This scale ${params.scale} can not be reached`);
                params.range = THREE.MathUtils.clamp(params.range, this.minDistance, this.maxDistance);
            }
        }

        if (params.tilt !== undefined) {
            const minTilt = 90 - THREE.MathUtils.radToDeg(this.maxPolarAngle);
            const maxTilt = 90 - THREE.MathUtils.radToDeg(this.minPolarAngle);
            if (params.tilt < minTilt || params.tilt > maxTilt) {
                params.tilt = THREE.MathUtils.clamp(params.tilt, minTilt, maxTilt);
                // eslint-disable-next-line no-console
                console.warn('Tilt was clamped to ', params.tilt, ` the interval is between ${minTilt} and ${maxTilt} degree`);
            }
        }

        previous = CameraUtils.getTransformCameraLookingAtTarget(this.view, this.camera);
        if (isAnimated) {
            params.callback = r => cameraTarget.position.copy(r.targetWorldPosition);
            this.dispatchEvent({ type: 'animation-started' });
            return CameraUtils.animateCameraToLookAtTarget(this.view, this.camera, params)
                .then((result) => {
                    this.dispatchEvent({ type: 'animation-ended' });
                    this.handlingEvent(result);
                    return result;
                });
        } else {
            return CameraUtils.transformCameraToLookAtTarget(this.view, this.camera, params).then((result) => {
                cameraTarget.position.copy(result.targetWorldPosition);
                this.handlingEvent(result);
                return result;
            });
        }
    }

    /**
     * Pick a position on the globe at the given position in lat,lon. See {@linkcode Coordinates} for conversion.
     * @param {Vector2} windowCoords - window coordinates
     * @param {number=} y - The y-position inside the Globe element.
     * @return {Coordinates} position
     */
    pickGeoPosition(windowCoords) {
        const pickedPosition = this.view.getPickingPositionFromDepth(windowCoords);

        if (!pickedPosition) {
            return;
        }

        return new Coordinates('EPSG:4978', pickedPosition).as('EPSG:4326');
    }
}

export default GlobeControls;
