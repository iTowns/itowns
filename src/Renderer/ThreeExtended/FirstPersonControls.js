import * as THREE from 'three';

// Note: we could use existing three.js controls (like https://github.com/mrdoob/three.js/blob/dev/examples/js/controls/FirstPersonControls.js)
// but including these controls in itowns allows use to integrate them tightly with itowns.
// Especially the existing controls are expecting a continuous update loop while we have a pausable one (so our controls use .notifyChange when needed)

function onPointerDown(event, pointerX, pointerY) {
    event.preventDefault();
    this._isUserInteracting = true;

    this._onMouseDownMouseX = pointerX;
    this._onMouseDownMouseY = pointerY;
    this._onMouseDownRotZ = this.camera.rotation.z;
    this._onMouseDownRotX = this.camera.rotation.x;
}

function onPointerMove(pointerX, pointerY) {
    if (this._isUserInteracting === true) {
        // in rigor we have tan(theta) = tan(cameraFOV) * deltaH / H
        // (where deltaH is the vertical amount we moved, and H the renderer height)
        // we loosely approximate tan(x) by x
        const pxToAngleRatio = THREE.Math.degToRad(this.camera.fov) / this.view.mainLoop.gfxEngine.height;
        this.camera.rotation.z = (pointerX - this._onMouseDownMouseX) * pxToAngleRatio + this._onMouseDownRotZ;
        this.camera.rotation.x = (pointerY - this._onMouseDownMouseY) * pxToAngleRatio + this._onMouseDownRotX;
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
        this._onMouseDownRotZ = 0;
        this._onMouseDownRotX = 0;

        this.camera.rotation.reorder('ZYX');

        const domElement = view.mainLoop.gfxEngine.renderer.domElement;
        const bindedPD = onPointerDown.bind(this);
        domElement.addEventListener('mousedown', e => bindedPD(e, e.clientX, e.clientY), false);
        domElement.addEventListener('touchstart', e => bindedPD(e, e.touches[0].pageX, e.touches[0].pageY), false);
        const bindedPM = onPointerMove.bind(this);
        domElement.addEventListener('mousemove', e => bindedPM(e.clientX, e.clientY), false);
        domElement.addEventListener('touchmove', e => bindedPM(e.touches[0].pageX, e.touches[0].pageY), false);
        domElement.addEventListener('mouseup', onDocumentMouseUp.bind(this), false);
        domElement.addEventListener('touchend', onDocumentMouseUp.bind(this), false);
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
            this.view.notifyChange(true);
        }
    }
}

export default FirstPersonControls;
