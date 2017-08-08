import * as THREE from 'three';

const MAX_FOV = 90;

// Note: we could use existing three.js controls (like https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/FirstPersonControls.js)
// but including these controls in itowns allows use to integrate them tightly with itowns.
// Especially the existing controls are expecting a continuous update loop while we have a pausable one (so our controls use .notifyChange when needed)

function onDocumentMouseDown(event) {
    event.preventDefault();
    this._isUserInteracting = true;

    this._onMouseDownMouseX = event.clientX;
    this._onMouseDownMouseY = event.clientY;
    this._onMouseDownPhi = this._phi;
    this._onMouseDownTheta = this._theta;
}

function onDocumentMouseMove(event) {
    if (this._isUserInteracting === true) {
        const fovCorrection = this.camera.fov / MAX_FOV; // 1 at MAX_FOV
        this._phi = (this._onMouseDownMouseX - event.clientX) * 0.13 * fovCorrection + this._onMouseDownPhi;
        this._theta = (event.clientY - this._onMouseDownMouseY) * 0.13 * fovCorrection + this._onMouseDownTheta;
        this.view.notifyChange(false);
    }
}

function onDocumentMouseUp() {
    this._isUserInteracting = false;
}

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

const MOVEMENTS = {
    38: { method: 'translateZ', sign: -1 }, // FORWARD: up key
    40: { method: 'translateZ', sign: 1 }, // BACKWARD: down key
    37: { method: 'translateX', sign: -1 }, // STRAFE_LEFT: left key
    39: { method: 'translateX', sign: 1 }, // STRAFE_RIGHT: right key
    33: { method: 'translateY', sign: 1 }, // UP: PageUp key
    34: { method: 'translateY', sign: -1 }, // DOWN: PageDown key
};


class FirstPersonControls extends THREE.EventDispatcher {
    constructor(view, options = {}) {
        super();
        this.camera = view.camera.camera3D;
        this.view = view;
        this.moves = new Set();
        this.moveSpeed = options.moveSpeed || 10; // backward or forward move speed in m/s
        this._isUserInteracting = false;
        this._onMouseDownMouseX = 0;
        this._onMouseDownMouseY = 0;
        this._onMouseDownPhi = 0;
        this._onMouseDownTheta = 0;

        // init from camera rotation
        this.camera.rotation.reorder('ZYX');
        this._theta = THREE.Math.radToDeg(this.camera.rotation.x);
        this._phi = THREE.Math.radToDeg(this.camera.rotation.z);
        this.updateAngles();

        const domElement = view.mainLoop.gfxEngine.renderer.domElement;
        domElement.addEventListener('mousedown', onDocumentMouseDown.bind(this), false);
        domElement.addEventListener('mousemove', onDocumentMouseMove.bind(this), false);
        domElement.addEventListener('mouseup', onDocumentMouseUp.bind(this), false);
        domElement.addEventListener('keyup', onKeyUp.bind(this), true);
        domElement.addEventListener('keydown', onKeyDown.bind(this), true);

        this.view.addFrameRequester(this);

        // focus policy
        if (options.focusOnMouseOver) {
            domElement.addEventListener('mouseover', () => domElement.focus());
        }
        if (options.focusOnClick) {
            domElement.addEventListener('click', () => domElement.focus());
        }
    }

    isUserInteracting() {
        return this.moves.size !== 0;
    }

    updateAngles() {
        this.camera.rotation.order = 'ZYX';
        this.camera.rotation.x = THREE.Math.degToRad(this._theta);
        this.camera.rotation.z = THREE.Math.degToRad(this._phi);

        this.view.notifyChange(true);
    }

    update(dt, updateLoopRestarted) {
        // if we are in a keypressed state, then update position

        // dt will not be relevant when we just started rendering, we consider a 1-frame move in this case
        if (updateLoopRestarted) {
            dt = 16;
        }

        for (const move of this.moves) {
            if (move.method === 'translateY') {
                this.camera.position.z += move.sign * this.moveSpeed * dt / 1000;
            } else {
                this.camera[move.method](move.sign * this.moveSpeed * dt / 1000);
            }
        }

        if (this.moves.size || this._isUserInteracting) {
            this.updateAngles();
        }
    }
}

export default FirstPersonControls;
