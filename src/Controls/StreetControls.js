import TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import FirstPersonControls from 'Controls/FirstPersonControls';

const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0.5 });

function createCircle() {
    const geomCircle = new THREE.CircleGeometry(1, 32);
    return new THREE.Mesh(geomCircle, material);
}

function createRectangle() {
    const geomPlane = new THREE.PlaneGeometry(4, 2, 1);
    const rectangle = new THREE.Mesh(geomPlane, material);
    rectangle.rotateX(-Math.PI / 2);
    return rectangle;
}

// update a surfaces node
function updateSurfaces(surfaces, position, norm) {
    surfaces.position.copy(position);
    surfaces.up.copy(position).normalize();
    surfaces.lookAt(norm);
    surfaces.updateMatrixWorld(true);
}

// vector use in the pick method
const target = new THREE.Vector3();

function pick(event, view, buildingsLayer, pickGround = () => {}, pickObject = () => {}, pickNothing = () => {}) {
    // get real distance to ground, with a specific method to pick on the elevation layer
    view.getPickingPositionFromDepth(view.eventToViewCoords(event), target);
    const distanceToGround = view.camera.camera3D.position.distanceTo(target);

    // pick on building layer
    const buildings = view.pickObjectsAt(event, 0, buildingsLayer);

    // to detect pick on building, compare first picked building distance to ground distance
    if (buildings.length && buildings[0].distance < distanceToGround) { // pick buildings
        // callback
        pickObject(buildings[0].point, buildings[0].face.normal);
    } else {
        // pick on ground layer (tile layer)
        const ground = view.pickObjectsAt(event, 0, view.tileLayer);
        if (ground.length) {
            // compute normal
            const normal = target.clone().multiplyScalar(1.1);

            // callback
            pickGround(target, normal);
        } else {
            // callback
            pickNothing();
        }
    }
}

// default function to compute time (in millis), used for the animation to move to a distance (in meter)
function computeTime(distance) {
    return 500 + Math.sqrt(distance) * 300;
}

/**
 * @classdesc Camera controls that can follow a path.
 * It is used to simulate a street view.
 * It stores a currentPosition and nextPosition, and do a camera traveling to go to next position.
 * It also manages picking on the ground and on other object, like building.
 * <ul> It manages 2 surfaces, used as helpers for the end user :
 * <li> a circle is shown when mouse is moving on the ground </li>
 * <li> a rectangle is shown when mouse is moving on other 3d object </li>
 * </ul>
 * <ul>
 * This controls is designed
 * <li> to move forward when user click on the ground (click and go) </li>
 * <li> to rotate the camera when user click on other object (click to look at) </li>
 * </ul>
 * <ul> Bindings inherited from FirstPersonControls
 * <li><b> up + down keys : </b> forward/backward </li>
 * <li><b> left + right keys: </b> strafing movements </li>
 * <li><b> pageUp + pageDown: </b> vertical movements </li>
 * <li><b> mouse click+drag: </b> pitch and yaw movements (as looking at a panorama) </li>
 * </ul>
 * <ul> Bindings added
 * <li><b> keys Z : </b> Move camera to the next position </li>
 * <li><b> keys S : </b> Move camera to the previous position </li>
 * <li><b> keys A : </b> Set camera to current position </li>
 * </ul>
 * Note that it only works in globe view.
 * @property {number} keyGoToNextPosition key code to go to next position, default to 90 for key Z
 * @property {number} keyGoToPreviousPosition key code to go to previous position, default to 83 for key S
 * @property {number} keySetCameraToCurrentPosition key code set camera to current position, default to 65 for key  A
 * @extends FirstPersonControls
 */
class StreetControls extends FirstPersonControls {
    /**
     * @constructor
     * @param { View } view - View where this control will be used
     * @param { Object } options - Configuration of this controls
     * @param { number } [options.wallMaxDistance=1000] - Maximum distance to click on a wall, in meter.
     * @param { number } [options.animationDurationWall=1000] - Time in millis for the animation when clicking on a wall.
     * @param { THREE.Mesh } [options.surfaceGround] - Surface helper to see when mouse is on the ground, default is a transparent circle.
     * @param { THREE.Mesh } [options.surfaceWall] - Surface helper to see when mouse is on a wall, default is a transparent rectangle.
     * @param { string } [options.buildingsLayer='Buildings'] - Name of the building layer (used to pick on wall).
     * @param { function } [options.computeTime] - Function to compute time (in millis), used for the animation to move to a distance (in meter)
     * @param { number } [options.offset=4] - Altitude in meter up to the ground to move to when click on a target on the ground.
     */
    constructor(view, options = {}) {
        super(view, options);

        this.isStreetControls = true;

        const domElement = view.mainLoop.gfxEngine.renderer.domElement;
        domElement.addEventListener('mouseout', super.onMouseUp.bind(this));

        // twos positions used by this control : current and next
        this.previousPosition = undefined;
        this.currentPosition = undefined;
        this.nextPosition = undefined;

        this.keyGoToNextPosition = 90;
        this.keyGoToPreviousPosition = 83;
        this.keySetCameraToCurrentPosition = 65;

        // Tween is used to make smooth animations
        this.tweenGroup = new TWEEN.Group();

        // init surfaces used as helper for end user
        this.surfaceGround = options.surfaceGround || createCircle();
        this.surfaceWall = options.surfaceWall || createRectangle();

        // surfaces is an object3D containing the two surfaces
        this.surfaces = new THREE.Object3D();
        this.surfaces.add(this.surfaceGround);
        this.surfaces.add(this.surfaceWall);
        this.view.scene.add(this.surfaces);

        this.wallMaxDistance = options.animationDurationWall || 1000;
        this.animationDurationWall = options.animationDurationWall || 1000;
        this.buildingsLayer = options.buildingsLayer || 'Buildings';
        this.computeTime = options.computeTime || computeTime;
        this.offset = options.offset || 4;
    }

    setCurrentPosition(newCurrentPosition) {
        this.currentPosition = newCurrentPosition;
    }

    setNextPosition(newNextPosition) {
        this.nextPosition = newNextPosition;
    }

    setPreviousPosition(newPreviousPosition) {
        this.previousPosition = newPreviousPosition;
    }

    onMouseUp(event) {
        super.onMouseUp();
        if (this._stateOnMouseDrag) {
            this._stateOnMouseDrag = false;
        } else {
            pick(event, this.view, this.buildingsLayer, this.onClickOnGround.bind(this), this.onClickOnWall.bind(this));
        }
    }

    onMouseMove(event) {
        super.onMouseMove(event);

        if (this._isMouseDown) {
            // state mouse drag (move + mouse click)
            this._stateOnMouseDrag = true;
            this.stopAnimations();
        }
        // mouse pick and manage surfaces
        pick(event, this.view, this.buildingsLayer,
            (groundTarget, normal) => {
                updateSurfaces(this.surfaces, groundTarget, normal);
                this.surfaceGround.visible = true;
                this.surfaceWall.visible = false;
            }, (wallTarget, normal) => {
                updateSurfaces(this.surfaces, wallTarget, normal);
                this.surfaceWall.visible = true;
                this.surfaceGround.visible = false;
            });
        this.view.notifyChange(this.surfaces);
    }

    /**
     * Sets the camera to the current position (stored in this controls), looking at the next position (also stored in this controls).
     */
    setCameraToCurrentPosition() {
        this.setCameraOnPosition(this.currentPosition, this.nextPosition);
    }

    /**
     * Set the camera on a position, looking at another position.
     *
     * @param      { THREE.Vector3 }  position   The position to set the camera
     * @param      { THREE.Vector3 }  lookAt      The position where the camera look at.
     */
    setCameraOnPosition(position, lookAt) {
        if (!position || !lookAt) {
            return;
        }
        this.camera.position.copy(position);
        this.camera.up.copy(position).normalize();
        this.camera.lookAt(lookAt);
        this.camera.updateMatrixWorld();
        this.reset();
    }

    /**
     * Method called when user click on the ground.</br>
     * Note that this funtion contains default values that can be overrided, by overriding this class.
     *
     * @param {THREE.Vector3} position - The position
     */
    onClickOnGround(position) {
        // compute a new position to go : 4 meter up from the picked position on the ground
        const up = position.clone().normalize();
        position.add(up.multiplyScalar(this.offset));

        // compute time to go there
        const distance = this.camera.position.distanceTo(position);
        // 500 millis constant, plus an amount of time depending of the distance (but not linearly)
        const time = this.computeTime(distance);

        // move the camera
        this.moveCameraTo(position, time);
    }

    /**
     * Method called when user click on oject that is not the ground.</br>
     * Note that this function contains default values that can be overrided, by overriding this class.
     *
     * @param {THREE.Vector3} position - The position
     */
    onClickOnWall(position) {
        const distance = this.camera.position.distanceTo(position);

        // can't click on a wall that is at 1km distance.
        if (distance < this.wallMaxDistance) {
            this.animateCameraLookAt(position, this.animationDurationWall);
        }
    }

    /**
     * Animate the camera to make it look at a position, in a given time
     *
     * @param { THREE.Vector3 }  position - Position to look at
     * @param { number } time - Time in millisecond
     */
    animateCameraLookAt(position, time) {
        // stop existing animation
        this.stopAnimations();
        // prepare start point and end point
        this.start = this.camera.clone();
        this.end = this.camera.clone();
        this.end.lookAt(position);
        this.tween = new TWEEN.Tween({ t: 0 }, this.tweenGroup).to({ t: 1 }, time)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
                this.animationFrameRequester = null;
            })
            .onUpdate((d) => {
                // 'manually' slerp the Quaternion to avoid rotation issues
                THREE.Quaternion.slerp(this.start.quaternion, this.end.quaternion, this.camera.quaternion, d.t);
            })
            .start();

        this.animationFrameRequester = () => {
            this.tweenGroup.update();
            // call reset from super class FirsPersonControls to make mouse rotation managed by FirstPersonControl still aligned
            this.reset();
            this.view.notifyChange(this.camera);
        };

        this.view.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
        this.view.notifyChange(this.camera);
    }

    /**
     * Move the camera smoothly to the position, in a given time.
     *
     * @param { THREE.Vector3 }  position - Destination of the movement.
     * @param { number } time - Time in millisecond
     */
    moveCameraTo(position, time) {
        if (!position) {
            return;
        }

        this.stopAnimations();

        this.tween = new TWEEN.Tween(this.camera.position, this.tweenGroup) // Create a new tween that modifies camera position
            .to(position.clone(), time)
            .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
            .onComplete(() => {
                this.view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
                this.animationFrameRequester = null;
            })
            .start();

        this.animationFrameRequester = () => {
            this.tweenGroup.update();

            this.view.notifyChange(this.camera);
        };

        this.view.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
        this.view.notifyChange(this.camera);
    }

    stopAnimations() {
        if (this.tween) {
            this.tween.stop();
            this.tween = undefined;
        }
        if (this.animationFrameRequester) {
            this.view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
            this.animationFrameRequester = null;
        }
    }

    /**
     * Move the camera to the 'currentPosition' stored in this control.
     */
    moveCameraToCurrentPosition() {
        this.moveCameraTo(this.currentPosition);
    }

    onKeyDown(e) {
        super.onKeyDown(e);

        // key to move to next position (default to Z)
        if (e.keyCode == this.keyGoToNextPosition) {
            this.moveCameraTo(this.nextPosition);
        }
        // key to move to previous position (default to S)
        if (e.keyCode == this.keyGoToPreviousPosition) {
            this.moveCameraTo(this.previousPosition);
        }
        // key to set to camera to current position looking at next position (default to A)
        if (e.keyCode == this.keySetCameraToCurrentPosition) {
            this.setCameraToCurrentPosition();
            this.view.notifyChange(this.view.camera.camera3D);
        }
    }
}

export default StreetControls;
