import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';

// Note: we could use existing three.js controls (like https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/FirstPersonControls.js)
// but including these controls in itowns allows use to integrate them tightly with itowns.
// Especially the existing controls are expecting a continuous update loop while we have a pausable one (so our controls use .notifyChange when needed)

function limitRotation(camera3D, rot, verticalFOV) {
    // Limit vertical rotation (look up/down) to make sure the user cannot see
    // outside of the cone defined by verticalFOV
    const limit = THREE.MathUtils.degToRad(verticalFOV - camera3D.fov) * 0.5;
    return THREE.MathUtils.clamp(rot, -limit, limit);
}
const axisY = new THREE.Vector3(0, 1, 0);
function applyRotation(view, camera3D, state) {
    camera3D.quaternion.setFromUnitVectors(axisY, camera3D.up);

    camera3D.rotateY(state.rotateY);
    camera3D.rotateX(state.rotateX);

    view.notifyChange(view.camera.camera3D);
}

const MOVEMENTS = {
    38: { method: 'translateZ', sign: -1 }, // FORWARD: up key
    40: { method: 'translateZ', sign: 1 }, // BACKWARD: down key
    37: { method: 'translateX', sign: -1 }, // STRAFE_LEFT: left key
    39: { method: 'translateX', sign: 1 }, // STRAFE_RIGHT: right key
    33: { method: 'translateY', sign: 1 }, // UP: PageUp key
    34: { method: 'translateY', sign: -1 }, // DOWN: PageDown key
};

function moveCameraVerticalPlanar(value) {
    this.camera.position.z += value;
}

const normal = new THREE.Vector3();
const q = new THREE.Quaternion();
const e = new THREE.Euler(0, 0, 0, 'YXZ');

function moveCameraVerticalGlobe(value) {
    // compute geodesic normale
    normal.copy(this.camera.position);
    normal.normalize();
    this.camera.position.add(normal.multiplyScalar(value));
}

class FirstPersonControls extends THREE.EventDispatcher {
    /**
     * @Constructor
     * @param {View} view
     * @param {object} options
     * @param {boolean} options.focusOnClick - whether or not to focus the renderer domElement on click
     * @param {boolean} options.focusOnMouseOver - whether or not to focus when the mouse is over the domElement
     * @param {boolean} options.moveSpeed - if > 0, pressing the arrow keys will move the camera
     * @param {number} options.verticalFOV - define the max visible vertical angle of the scene in degrees (default 180)
     * @param {number} options.panoramaRatio - alternative way to specify the max vertical angle when using a panorama.
     * You can specify the panorama width/height ratio and the verticalFOV will be computed automatically
     * @param {boolean} options.disableEventListeners - if true, the controls will not self listen to mouse/key events.
     * You'll have to manually forward the events to the appropriate functions: onMouseDown, onMouseMove, onMouseUp,
     * onKeyUp, onKeyDown and onMouseWheel.
     */
    constructor(view, options = {}) {
        super();
        this.isFirstPersonControls = true;
        this.camera = view.camera.camera3D;
        this.view = view;
        this.moves = new Set();
        if (options.panoramaRatio) {
            const radius = (options.panoramaRatio * 200) / (2 * Math.PI);
            options.verticalFOV =
                options.panoramaRatio == 2 ? 180 : THREE.MathUtils.radToDeg(2 * Math.atan(200 / (2 * radius)));
        }
        options.verticalFOV = options.verticalFOV || 180;
        options.moveSpeed = options.moveSpeed === undefined ? 10 : options.moveSpeed; // backward or forward move speed in m/s
        this.options = options;

        this._isMouseDown = false;
        this._onMouseDownMouseX = 0;
        this._onMouseDownMouseY = 0;

        this._state = {
            rotateX: 0,
            rotateY: 0,
            snapshot() {
                return {
                    rotateX: this.rotateX,
                    rotateY: this.rotateY,
                };
            },
        };
        this.reset();

        this.eventListeners = options.disableEventListeners;
        if (!options.disableEventListeners) {
            this._onMouseDown = this.onMouseDown.bind(this);
            this._onMouseMove = this.onMouseMove.bind(this);
            this._onMouseUp = this.onMouseUp.bind(this);
            this._onMouseWheel = this.onMouseWheel.bind(this);
            this._onKeyUp = this.onKeyUp.bind(this);
            this._onKeyDown = this.onKeyDown.bind(this);
            view.domElement.addEventListener('mousedown', this._onMouseDown, false);
            view.domElement.addEventListener('touchstart', this._onMouseDown, false);
            view.domElement.addEventListener('mousemove', this._onMouseMove, false);
            view.domElement.addEventListener('touchmove', this._onMouseMove, false);
            view.domElement.addEventListener('mouseup', this._onMouseUp, false);
            view.domElement.addEventListener('touchend', this._onMouseUp, false);
            view.domElement.addEventListener('mousewheel', this._onMouseWheel, false);
            view.domElement.addEventListener('DOMMouseScroll', this._onMouseWheel, false); // firefox

            // TODO: Why windows
            document.addEventListener('keydown', this._onKeyDown, false);
            document.addEventListener('keyup', this._onKeyUp, false);
        }

        this.view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, this.update.bind(this));

        // focus policy
        this._onFocus = () => view.domElement.focus();
        this.focusOnMouseOver = options.focusOnMouseOver;
        if (options.focusOnMouseOver) {
            view.domElement.addEventListener('mouseover', this._onFocus);
        }
        this.focusOnClick = options.focusOnClick;
        if (options.focusOnClick) {
            view.domElement.addEventListener('click', this._onFocus);
        }

        if (view.referenceCrs == 'EPSG:4978') {
            this.moveCameraVertical = moveCameraVerticalGlobe;
        } else {
            this.moveCameraVertical = moveCameraVerticalPlanar;
        }
    }

    isUserInteracting() {
        return this.moves.size !== 0 && !this._isMouseDown;
    }

    /**
     * Resets the controls internal state to match the camera' state.
     * This must be called when manually modifying the camera's position or rotation.
     * @param {boolean} preserveRotationOnX - if true, the look up/down rotation will
     * not be copied from the camera
     */
    reset(preserveRotationOnX = false) {
        // Compute the correct init state, given the calculus in applyRotation:
        // cam.quaternion = q * r
        // => r = invert(q) * cam.quaterion
        // q is the quaternion derived from the up vector
        q.setFromUnitVectors(axisY, this.camera.up);
        q.invert();
        q.multiply(this.camera.quaternion);
        // tranform it to euler
        e.setFromQuaternion(q);

        if (!preserveRotationOnX) {
            this._state.rotateX = e.x;
        }
        this._state.rotateY = e.y;
    }

    /**
     * Updates the camera position / rotation based on occured input events.
     * This is done automatically when needed but can also be done if needed.
     * @param {number} dt - ellpased time since last update in seconds
     * @param {boolean} updateLoopRestarted - true if itowns' update loop just restarted
     * @param {boolean} force - set to true if you want to force the update, even if it
     * appears unneeded.
     */
    update(dt, updateLoopRestarted, force) {
        if (this.enabled == false) { return; }

        // dt will not be relevant when we just started rendering, we consider a 1-frame move in this case
        if (updateLoopRestarted) {
            dt = 16;
        }

        for (const move of this.moves) {
            if (move.method === 'translateY') {
                this.moveCameraVertical(move.sign * this.options.moveSpeed * dt / 1000);
            } else {
                this.camera[move.method](move.sign * this.options.moveSpeed * dt / 1000);
            }
        }

        if (this._isMouseDown === true || force === true) {
            applyRotation(this.view, this.camera, this._state);
        }

        if (this.moves.size) {
            this.view.notifyChange(this.view.camera.camera3D);
        }
    }

    // Event callback functions
    // Mouse movement handling
    onMouseDown(event) {
        if (this.enabled == false) { return; }

        // next line is commented because, when I uncomment it, key binding doesn't work any more.
        // event.preventDefault();

        this._isMouseDown = true;

        const coords = this.view.eventToViewCoords(event);
        this._onMouseDownMouseX = coords.x;
        this._onMouseDownMouseY = coords.y;

        this._stateOnMouseDown = this._state.snapshot();
    }

    onMouseUp() {
        if (this.enabled == false) { return; }

        this._isMouseDown = false;
    }

    onMouseMove(event) {
        if (this.enabled == false) { return; }

        if (this._isMouseDown === true) {
            // in rigor we have tan(theta) = tan(cameraFOV) * deltaH / H
            // (where deltaH is the vertical amount we moved, and H the renderer height)
            // we loosely approximate tan(x) by x
            const pxToAngleRatio = THREE.MathUtils.degToRad(this.camera.fov) / this.view.mainLoop.gfxEngine.height;

            const coords = this.view.eventToViewCoords(event);

            // update state based on pointer movement
            this._state.rotateY = ((coords.x - this._onMouseDownMouseX) * pxToAngleRatio) + this._stateOnMouseDown.rotateY;
            this._state.rotateX = limitRotation(
                this.camera,
                ((coords.y - this._onMouseDownMouseY) * pxToAngleRatio) + this._stateOnMouseDown.rotateX,
                this.options.verticalFOV);

            applyRotation(this.view, this.camera, this._state);
        }
    }

    // Mouse wheel
    onMouseWheel(event) {
        if (this.enabled == false) { return; }

        let delta = 0;
        if (event.wheelDelta !== undefined) {
            delta = -event.wheelDelta;
        // Firefox
        } else if (event.detail !== undefined) {
            delta = event.detail;
        }

        this.camera.fov =
            THREE.MathUtils.clamp(this.camera.fov + Math.sign(delta),
                10,
                Math.min(100, this.options.verticalFOV));

        this.camera.updateProjectionMatrix();

        this._state.rotateX = limitRotation(
            this.camera,
            this._state.rotateX,
            this.options.verticalFOV);

        applyRotation(this.view, this.camera, this._state);
    }

    // Keyboard handling
    onKeyUp(e) {
        if (this.enabled == false) { return; }

        const move = MOVEMENTS[e.keyCode];
        if (move) {
            this.moves.delete(move);
            this.view.notifyChange(undefined, false);
            e.preventDefault();
        }
    }

    onKeyDown(e) {
        if (this.enabled == false) { return; }

        const move = MOVEMENTS[e.keyCode];
        if (move) {
            this.moves.add(move);
            this.view.notifyChange(undefined, false);
            e.preventDefault();
        }
    }

    dispose() {
        if (!this.eventListeners) {
            this.view.domElement.removeEventListener('mousedown', this._onMouseDown, false);
            this.view.domElement.removeEventListener('touchstart', this._onMouseDown, false);
            this.view.domElement.removeEventListener('mousemove', this._onMouseMove, false);
            this.view.domElement.removeEventListener('touchmove', this._onMouseMove, false);
            this.view.domElement.removeEventListener('mouseup', this._onMouseUp, false);
            this.view.domElement.removeEventListener('touchend', this._onMouseUp, false);
            this.view.domElement.removeEventListener('mousewheel', this._onMouseWheel, false);
            this.view.domElement.removeEventListener('DOMMouseScroll', this._onMouseWheel, false); // firefox

            document.removeEventListener('keydown', this._onKeyDown, false);
            document.removeEventListener('keyup', this._onKeyUp, false);
        }

        if (this.focusOnMouseOver) {
            this.view.domElement.removeEventListener('mouseover', this._onFocus);
        }

        if (this.focusOnClick) {
            this.view.domElement.removeEventListener('click', this._onFocus);
        }

        this.dispatchEvent({ type: 'dispose' });
    }
}

export default FirstPersonControls;
