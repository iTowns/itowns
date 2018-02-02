import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from '../../Core/MainLoop';

// Note: we could use existing three.js controls (like https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/FirstPersonControls.js)
// but including these controls in itowns allows use to integrate them tightly with itowns.
// Especially the existing controls are expecting a continuous update loop while we have a pausable one (so our controls use .notifyChange when needed)


// Mouse movement handling
function onDocumentMouseDown(event) {
    event.preventDefault();
    this._isMouseDown = true;

    const coords = this.view.eventToViewCoords(event);
    this._onMouseDownMouseX = coords.x;
    this._onMouseDownMouseY = coords.y;

    this._stateOnMouseDown = this._state.snapshot();
}

function limitRotation(camera3D, rot, verticalFOV) {
    // Limit vertical rotation (look up/down) to make sure the user cannot see
    // outside of the cone defined by verticalFOV
    const limit = THREE.Math.degToRad(verticalFOV - camera3D.fov) * 0.5;
    return THREE.Math.clamp(rot, -limit, limit);
}

function onPointerMove(event) {
    if (this._isMouseDown === true) {
        // in rigor we have tan(theta) = tan(cameraFOV) * deltaH / H
        // (where deltaH is the vertical amount we moved, and H the renderer height)
        // we loosely approximate tan(x) by x
        const pxToAngleRatio = THREE.Math.degToRad(this.camera.fov) / this.view.mainLoop.gfxEngine.height;

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

function applyRotation(view, camera3D, state) {
    camera3D.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), camera3D.up);

    camera3D.rotateY(state.rotateY);
    camera3D.rotateX(state.rotateX);

    view.notifyChange(true, camera3D);
}

// Mouse wheel
function onDocumentMouseWheel(event) {
    let delta = 0;
    if (event.wheelDelta !== undefined) {
        delta = -event.wheelDelta;
    // Firefox
    } else if (event.detail !== undefined) {
        delta = event.detail;
    }

    this.camera.fov =
        THREE.Math.clamp(this.camera.fov + Math.sign(delta),
            10,
            Math.min(100, this.options.verticalFOV));

    this.camera.updateProjectionMatrix();

    this._state.rotateX = limitRotation(
        this.camera,
        this._state.rotateX,
        this.options.verticalFOV);

    applyRotation(this.view, this.camera, this._state);
}

function onDocumentMouseUp() {
    this._isMouseDown = false;
}

const MOVEMENTS = {
    38: { method: 'translateZ', sign: -1 }, // FORWARD: up key
    40: { method: 'translateZ', sign: 1 }, // BACKWARD: down key
    37: { method: 'translateX', sign: -1 }, // STRAFE_LEFT: left key
    39: { method: 'translateX', sign: 1 }, // STRAFE_RIGHT: right key
    33: { method: 'translateY', sign: 1 }, // UP: PageUp key
    34: { method: 'translateY', sign: -1 }, // DOWN: PageDown key
};
// Keyboard handling
function onKeyUp(e) {
    const move = MOVEMENTS[e.keyCode];
    if (move) {
        this.moves.delete(move);
        this.view.notifyChange(true);
        e.preventDefault();
    }
}

function onKeyDown(e) {
    const move = MOVEMENTS[e.keyCode];
    if (move) {
        this.moves.add(move);
        this.view.notifyChange(false);
        e.preventDefault();
    }
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
     */
    constructor(view, options = {}) {
        super();
        this.camera = view.camera.camera3D;
        this.view = view;
        this.moves = new Set();
        if (options.panoramaRatio) {
            const radius = (options.panoramaRatio * 200) / (2 * Math.PI);
            options.verticalFOV =
                options.panoramaRatio == 2 ? 180 : THREE.Math.radToDeg(2 * Math.atan(200 / (2 * radius)));
        }
        options.verticalFOV = options.verticalFOV || 180;
        options.moveSpeed = options.moveSpeed === undefined ? 10 : options.moveSpeed; // backward or forward move speed in m/s
        this.options = options;

        this._isMouseDown = false;
        this._onMouseDownMouseX = 0;
        this._onMouseDownMouseY = 0;

        // Compute the correct init state, given the calculus in applyRotation:
        // cam.quaternion = q * r
        // => r = inverse(q) * cam.quaterion
        // q is the quaternion derived from the up vector
        const q = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0), this.camera.up);
        q.inverse();
        // compute r
        const r = this.camera.quaternion.clone().premultiply(q);
        // tranform it to euler
        const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(r);
        // and use it as the initial state
        const self = this;
        this._state = {
            rotateX: e.x,
            rotateY: e.y,

            snapshot() {
                return { rotateX: self._state.rotateX, rotateY: self._state.rotateY };
            },
        };

        const domElement = view.mainLoop.gfxEngine.renderer.domElement;
        const bindedPD = onDocumentMouseDown.bind(this);
        domElement.addEventListener('mousedown', bindedPD, false);
        domElement.addEventListener('touchstart', bindedPD, false);
        const bindedPM = onPointerMove.bind(this);
        domElement.addEventListener('mousemove', bindedPM, false);
        domElement.addEventListener('touchmove', bindedPM, false);
        domElement.addEventListener('mouseup', onDocumentMouseUp.bind(this), false);
        domElement.addEventListener('touchend', onDocumentMouseUp.bind(this), false);
        domElement.addEventListener('keyup', onKeyUp.bind(this), true);
        domElement.addEventListener('keydown', onKeyDown.bind(this), true);
        domElement.addEventListener('mousewheel', onDocumentMouseWheel.bind(this), false);
        domElement.addEventListener('DOMMouseScroll', onDocumentMouseWheel.bind(this), false); // firefox

        this.view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, this.update.bind(this));

        // focus policy
        if (options.focusOnMouseOver) {
            domElement.addEventListener('mouseover', () => domElement.focus());
        }
        if (options.focusOnClick) {
            domElement.addEventListener('click', () => domElement.focus());
        }
    }

    isUserInteracting() {
        return this.moves.size !== 0 && !this._isMouseDown;
    }

    update(dt, updateLoopRestarted) {
        // if we are in a keypressed state, then update position

        // dt will not be relevant when we just started rendering, we consider a 1-frame move in this case
        if (updateLoopRestarted) {
            dt = 16;
        }

        for (const move of this.moves) {
            if (move.method === 'translateY') {
                this.camera.position.z += move.sign * this.options.moveSpeed * dt / 1000;
            } else {
                this.camera[move.method](move.sign * this.options.moveSpeed * dt / 1000);
            }
        }

        if (this.moves.size || this._isMouseDown) {
            this.view.notifyChange(true);
        }
    }
}

export default FirstPersonControls;
