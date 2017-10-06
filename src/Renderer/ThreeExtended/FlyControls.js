import * as THREE from 'three';

const MOVEMENTS = {
    38: { method: 'translateZ', sign: -1 }, // FORWARD: up key
    40: { method: 'translateZ', sign: 1 }, // BACKWARD: down key
    37: { method: 'translateX', sign: -1 }, // STRAFE_LEFT: left key
    39: { method: 'translateX', sign: 1 }, // STRAFE_RIGHT: right key
    33: { method: 'rotateZ', sign: 1, noSpeed: true }, // UP: PageUp key
    34: { method: 'rotateZ', sign: -1, noSpeed: true }, // DOWN: PageDown key
    wheelup: { method: 'translateZ', sign: 1, oneshot: true }, // WHEEL up
    wheeldown: { method: 'translateZ', sign: -1, oneshot: true }, // WHEEL down
};

function onDocumentMouseDown(event) {
    event.preventDefault();
    this._isMouseDown = true;

    this._onMouseDownMouseX = event.clientX;
    this._onMouseDownMouseY = event.clientY;
}

function onTouchStart(event) {
    event.preventDefault();
    this._isMouseDown = true;

    this._onMouseDownMouseX = event.touches[0].pageX;
    this._onMouseDownMouseY = event.touches[0].pageY;
}


function onPointerMove(pointerX, pointerY) {
    if (this._isMouseDown === true) {
        // in rigor we have tan(theta) = tan(cameraFOV) * deltaH / H
        // (where deltaH is the vertical amount we moved, and H the renderer height)
        // we loosely approximate tan(x) by x
        const pxToAngleRatio = THREE.Math.degToRad(this._camera3D.fov) / this.view.mainLoop.gfxEngine.height;
        this._camera3D.rotateY((pointerX - this._onMouseDownMouseX) * pxToAngleRatio);
        this._camera3D.rotateX((pointerY - this._onMouseDownMouseY) * pxToAngleRatio);
        this._onMouseDownMouseX = pointerX;
        this._onMouseDownMouseY = pointerY;
        this.view.notifyChange(false, this._camera3D);
    }
}

function onDocumentMouseUp() {
    this._isMouseDown = false;
}

function onKeyUp(e) {
    const move = MOVEMENTS[e.keyCode];
    if (move) {
        this.moves.delete(move);
        e.preventDefault();
    }
}

function onKeyDown(e) {
    const move = MOVEMENTS[e.keyCode];
    if (move) {
        this.moves.add(move);
        this.view.notifyChange(false, this);
        e.preventDefault();
    }
}

function onDocumentMouseWheel(event) {
    let delta = 0;
    if (event.wheelDelta !== undefined) {
        delta = event.wheelDelta;
    // Firefox
    } else if (event.detail !== undefined) {
        delta = -event.detail;
    }
    if (delta < 0) {
        this.moves.add(MOVEMENTS.wheelup);
    } else {
        this.moves.add(MOVEMENTS.wheeldown);
    }

    this.view.notifyChange(false, this);
}

/**
 * First-Person controls (at least a possible declination of it).
 *
 * Bindings:
 * - up + down keys: forward/backward
 * - left + right keys: strafing movements
 * - PageUp + PageDown: roll movement
 * - mouse click+drag: pitch and yaw movements (as looking at a panorama, not as in FPS games for instance)
 */
class FlyControls extends THREE.EventDispatcher {

    /**
     * @Constructor
     * @param {View} view
     * @param {object} options
     * @param {boolean} options.focusOnClick - whether or not to focus the renderer domElement on click
     * @param {boolean} options.focusOnMouseOver - whether or not to focus when the mouse is over the domElement
     */
    constructor(view, options = {}) {
        super();
        const domElement = view.mainLoop.gfxEngine.renderer.domElement;
        this.view = view;
        this.options = options;
        this._camera3D = view.camera.camera3D;
        this.moves = new Set();
        this.moveSpeed = 10; // backward or forward move speed in m/s

        this._onMouseDownMouseX = 0;
        this._onMouseDownMouseY = 0;

        this._isMouseDown = false;

        domElement.addEventListener('mousedown', onDocumentMouseDown.bind(this), false);
        domElement.addEventListener('touchstart', onTouchStart.bind(this), false);
        const bindedPM = onPointerMove.bind(this);
        domElement.addEventListener('mousemove', e => bindedPM(e.clientX, e.clientY), false);
        domElement.addEventListener('touchmove', e => bindedPM(e.touches[0].pageX, e.touches[0].pageY), false);
        domElement.addEventListener('mouseup', onDocumentMouseUp.bind(this), false);
        domElement.addEventListener('touchend', onDocumentMouseUp.bind(this), false);
        domElement.addEventListener('mousewheel', onDocumentMouseWheel.bind(this), false);
        domElement.addEventListener('DOMMouseScroll', onDocumentMouseWheel.bind(this), false); // firefox
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
        return this.moves.size !== 0 || this._isMouseDown;
    }

    update(dt, updateLoopRestarted) {
        // if we are in a keypressed state, then update position

        // dt will not be relevant when we just started rendering, we consider a 1-frame move in this case
        if (updateLoopRestarted) {
            dt = 16;
        }

        for (const move of this.moves) {
            this._camera3D[move.method](move.sign * (move.noSpeed ? 1 : this.moveSpeed) * dt / 1000);
        }

        if (this.moves.size > 0 || this._isMouseDown) {
            this.view.notifyChange(true, this._camera3D);

            for (const move of this.moves) {
                if (move.oneshot) {
                    this.moves.delete(move);
                }
            }
        }
    }
}

export default FlyControls;
