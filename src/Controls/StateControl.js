import * as THREE from 'three';

const CONTROL_KEYS = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40,
    SPACE: 32,
    SHIFT: 16,
    CTRL: 17,
    S: 83,
};


// TODO : a class should be made for `State`, and the properties marked with `_` prefix should be made private
const DEFAULT_STATES = {
    ORBIT: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        keyboard: CONTROL_KEYS.CTRL,
        finger: 2,
        _event: 'rotate',
    },
    MOVE_GLOBE: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        finger: 1,
        _event: 'drag',
    },
    DOLLY: {
        enable: true,
        mouseButton: THREE.MOUSE.MIDDLE,
        double: false,
        finger: 2,
        _event: 'dolly',
    },
    PAN: {
        enable: true,
        mouseButton: THREE.MOUSE.RIGHT,
        double: false,
        finger: 3,
        up: CONTROL_KEYS.UP,
        bottom: CONTROL_KEYS.BOTTOM,
        left: CONTROL_KEYS.LEFT,
        right: CONTROL_KEYS.RIGHT,
        _event: 'pan',
    },
    PANORAMIC: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        keyboard: CONTROL_KEYS.SHIFT,
        _event: 'panoramic',
    },
    TRAVEL_IN: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: true,
        _event: 'travel_in',
        _trigger: true,
    },
    TRAVEL_OUT: {
        enable: false,
        double: false,
        _event: 'travel_out',
        _trigger: true,
    },
};


const viewCoords = new THREE.Vector2();


function stateToTrigger(state) {
    if (!state) {
        return undefined;
    } else if (state.keyboard) {
        return 'keydown';
    }
}


/**
 * @typedef {Object} StateControl~State
 * @property {boolean} enable=true Indicate whether the state is enabled or not.
 * @property {Number} [mouseButton] The mouse button bound to this state.
 * @property {Number} [keyboard] The keyCode of the keyboard input bound to this state.
 * @property {Number} [finger] The number of fingers on the pad bound to this state.
 * @property {boolean} [double] True if the mouse button bound to this state must be pressed twice. For
                                * example, if `double` is set to true with a `mouseButton` set to left click,
                                * the State will be bound to a double click mouse button.
 */

/**
 * It represents the control's states.
 * Each {@link State} is a control mode of the camera and how to interact with
 * the interface to activate this mode.
 * @class StateControl
 *
 * @property {State}    NONE        {@link State} when camera is idle.
 * @property {State}    ORBIT       {@link State} describing camera orbiting movement : the camera moves around its
                                    * target at a constant distance from it.
 * @property {State}    DOLLY       {@link State} describing camera dolly movement : the camera moves forward or
                                    * backward from its target.
 * @property {State}    PAN         {@link State} describing camera pan movement : the camera moves parallel to the
                                    * current view plane.
 * @property {State}    MOVE_GLOBE  {@link State} describing camera drag movement : the camera is moved around the view
                                    * to give the feeling that the view is dragged under a static camera.
 * @property {State}    PANORAMIC   {@link State} describing camera panoramic movement : the camera is rotated around
                                    * its own position.
 * @property {State}    TRAVEL_IN   {@link State} describing camera travel in movement : the camera is zoomed in toward
                                    * a given position. The target position depends on the key/mouse binding of this
                                    * state. If bound to a mouse button, the target position is the mouse position.
                                    * Otherwise, it is the center of the screen.
 * @property {State}    TRAVEL_OUT  {@link State} describing camera travel out movement : the camera is zoomed out from
                                    * a given position. The target position depends on the key/mouse binding of this
                                    * state. If bound to a mouse button, the target position is the mouse position.
                                    * Otherwise, it is the center of the screen. It is disabled by default.
 */
class StateControl extends THREE.EventDispatcher {
    constructor(view, options = {}) {
        super();

        this._view = view;
        this._domElement = view.domElement;

        this.NONE = {};

        let currentState = this.NONE;
        Object.defineProperty(this, 'currentState', {
            get: () => currentState,
            set: (newState) => {
                if (currentState !== newState) {
                    const previous = currentState;
                    currentState = newState;
                    this.dispatchEvent({ type: 'state-changed', viewCoords, previous });
                }
            },
        });

        // TODO : the 3 next properties should be made private when ES6 allows it
        this._clickTimeStamp = 0;
        this._lastMousePressed = { viewCoords: new THREE.Vector2() };
        this._currentKeyPressed = undefined;

        this._onPointerDown = this.onPointerDown.bind(this);
        this._onPointerMove = this.onPointerMove.bind(this);
        this._onPointerUp = this.onPointerUp.bind(this);

        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);

        this._onBlur = this.onBlur.bind(this);
        this._onContextMenu = this.onContextMenu.bind(this);

        this._domElement.addEventListener('pointerdown', this._onPointerDown, false);

        // The event listener is added on `window` so that key input can be accounted event if the view does not have
        // the focus. This can occur at page loading, when a mini map is displayed : the minimap initially has the focus
        // and key input would not be considered on the view's domElement.
        window.addEventListener('keydown', this._onKeyDown, false);
        window.addEventListener('keyup', this._onKeyUp, false);

        // Reset key/mouse when window loose focus
        window.addEventListener('blur', this._onBlur);
        // disable context menu when right-clicking
        this._domElement.addEventListener('contextmenu', this._onContextMenu, false);

        // TODO : this shall be removed when switching keyboard management form Controls to StateControls
        this._handleTravelInEvent = (event) => {
            if (this.TRAVEL_IN === this.inputToState(event.button, event.keyCode, this.TRAVEL_IN.double)) {
                this.dispatchEvent({
                    type: 'travel_in',
                    viewCoords: this._view.eventToViewCoords(event),
                });
            }
        };
        this._handleTravelOutEvent = (event) => {
            if (this.TRAVEL_OUT === this.inputToState(event.button, event.keyCode, this.TRAVEL_OUT.double)) {
                this.dispatchEvent({
                    type: 'travel_out',
                    viewCoords: this._view.eventToViewCoords(event),
                });
            }
        };

        this.setFromOptions(options);
    }

    /**
     * get the state corresponding to the mouse button and the keyboard key. If the input relates to a trigger - a
     * single event which triggers movement, without the move of the mouse for instance -, dispatch a relevant event.
     * @param      {Number}  mouseButton  The mouse button
     * @param      {Number}  keyboard     The keyboard
     * @param      {Boolean} [double]     Value of the searched state `double` property
     * @return     {State}  the state corresponding
     */
    inputToState(mouseButton, keyboard, double = false) {
        for (const key of Object.keys(DEFAULT_STATES)) {
            const state = this[key];
            if (state.enable
                && state.mouseButton === mouseButton
                && state.keyboard === keyboard
                && state.double === double
            ) {
                // If the input relates to a state, returns it
                if (!state._trigger) { return state; }
                // If the input relates to a trigger (TRAVEL_IN, TRAVEL_OUT), dispatch a relevant event.
                this.dispatchEvent({ type: state._event, viewCoords });
            }
        }
        return this.NONE;
    }

    /**
     * get the state corresponding to the number of finger on the pad
     *
     * @param      {Number}  finger  The number of finger
     * @return     {state}  the state corresponding
     */
    touchToState(finger) {
        for (const key of Object.keys(DEFAULT_STATES)) {
            const state = this[key];
            if (state.enable && finger == state.finger) {
                return state;
            }
        }
        return this.NONE;
    }

    /**
     * Set the current StateControl {@link State} properties to given values.
     * @param {Object}  options     Object containing the `State` values to set current `StateControl` properties to.
                                    * The `enable` property do not necessarily need to be specified. In that case, the
                                    * previous value of this property will be kept for the new {@link State}.
     *
     * @example
     * // Switch bindings for PAN and MOVE_GLOBE actions, and disabling PANORAMIC movement :
     * view.controls.states.setFromOptions({
     *     PAN: {
     *         mouseButton: itowns.THREE.MOUSE.LEFT,
     *     },
     *     MOVE_GLOBE: {
     *         mouseButton: itowns.THREE.MOUSE.RIGHT,
     *     },
     *     PANORAMIC: {
     *         enable: false,
     *     },
     * };
     */
    setFromOptions(options) {
        this._domElement.removeEventListener(stateToTrigger(this.TRAVEL_IN), this._handleTravelInEvent, false);
        this._domElement.removeEventListener(stateToTrigger(this.TRAVEL_OUT), this._handleTravelOutEvent, false);

        for (const state in DEFAULT_STATES) {
            if ({}.hasOwnProperty.call(DEFAULT_STATES, state)) {
                let newState = {};
                newState = options[state] || this[state] || Object.assign(newState, DEFAULT_STATES[state]);

                // Copy the previous value of `enable` property if not defined in options
                if (options[state] && options[state].enable === undefined) {
                    newState.enable = this[state].enable;
                }
                // If no value is provided for the `double` property,
                // defaults it to `false` instead of leaving it undefined
                newState.double = !!newState.double;

                // Copy the `_event` and `_trigger` properties
                newState._event = DEFAULT_STATES[state]._event;
                newState._trigger = DEFAULT_STATES[state]._trigger;

                this[state] = newState;
            }
        }

        this._domElement.addEventListener(stateToTrigger(this.TRAVEL_IN), this._handleTravelInEvent, false);
        this._domElement.addEventListener(stateToTrigger(this.TRAVEL_OUT), this._handleTravelOutEvent, false);
    }


    // ---------- POINTER EVENTS : ----------

    onPointerDown(event) {
        switch (event.pointerType) {
            case 'mouse':
                this.handleMouseDown(event);
                break;
            // TODO : add touch event management
            default:
        }
        this._domElement.addEventListener('pointermove', this._onPointerMove, false);
        this._domElement.addEventListener('pointerup', this._onPointerUp, false);
        this._domElement.addEventListener('mouseleave', this._onPointerUp, false);
    }

    onPointerMove(event) {
        switch (event.pointerType) {
            case 'mouse':
                this.handleMouseMove(event);
                break;
            // TODO : add touch event management
            default:
        }
    }

    onPointerUp() {
        this._domElement.removeEventListener('pointermove', this._onPointerMove, false);
        this._domElement.removeEventListener('pointerup', this._onPointerUp, false);
        this._domElement.removeEventListener('mouseleave', this._onPointerUp, false);

        this.currentState = this.NONE;
    }


    // ---------- MOUSE EVENTS : ----------

    handleMouseDown(event) {
        viewCoords.copy(this._view.eventToViewCoords(event));

        // Detect if the mouse button was pressed less than 500 ms before, and if the cursor has not moved two much
        // since previous click. If so, set dblclick to true.
        const dblclick = event.timeStamp - this._clickTimeStamp < 500
            && this._lastMousePressed.button === event.button
            && this._lastMousePressed.viewCoords.distanceTo(viewCoords) < 5;
        this._clickTimeStamp = event.timeStamp;
        this._lastMousePressed.button = event.button;
        this._lastMousePressed.viewCoords.copy(viewCoords);

        this.currentState = this.inputToState(event.button, this._currentKeyPressed, dblclick);
    }

    handleMouseMove(event) {
        event.preventDefault();

        viewCoords.copy(this._view.eventToViewCoords(event));
        this.dispatchEvent({ type: this.currentState._event, viewCoords });
    }


    // ---------- KEYBOARD EVENTS : ----------

    onKeyDown(event) {
        this._currentKeyPressed = event.keyCode;
    }

    onKeyUp() { this._currentKeyPressed = undefined; }


    onBlur() {
        this.onKeyUp();
        this.onPointerUp();
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    /**
     * Remove all event listeners created within this instance of `StateControl`
     */
    dispose() {
        this._clickTimeStamp = 0;
        this._lastMousePressed = undefined;
        this._currentKeyPressed = undefined;

        this._domElement.removeEventListener('pointerdown', this._onPointerDown, false);
        this._domElement.removeEventListener('pointermove', this._onPointerMove, false);
        this._domElement.removeEventListener('pointerup', this._onPointerUp, false);

        this._domElement.removeEventListener('keydown', this._onKeyDown, false);
        this._domElement.removeEventListener('keyup', this._onKeyUp, false);

        window.removeEventListener('blur', this._onBlur);
        this._domElement.removeEventListener('contextmenu', this._onContextMenu, false);

        this._domElement.removeEventListener(this.TRAVEL_IN.trigger, this._handleTravelInEvent, false);
        this._domElement.removeEventListener(this.TRAVEL_OUT.trigger, this._handleTravelInEvent, false);
    }
}

export default StateControl;
