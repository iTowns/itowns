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


const DEFAULT_STATES = {
    ORBIT: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        keyboard: CONTROL_KEYS.CTRL,
        finger: 2,
    },
    MOVE_GLOBE: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        finger: 1,
    },
    DOLLY: {
        enable: true,
        mouseButton: THREE.MOUSE.MIDDLE,
        double: false,
        finger: 2,
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
    },
    PANORAMIC: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        keyboard: CONTROL_KEYS.SHIFT,
    },
    TRAVEL_IN: {
        enable: true,
        mouseButton: THREE.MOUSE.LEFT,
        double: true,
    },
    TRAVEL_OUT: {
        enable: false,
        double: false,
    },
};


function stateToTrigger(state) {
    if (!state) {
        return undefined;
    } else if (state.mouseButton === THREE.MOUSE.LEFT && state.double) {
        return 'dblclick';
    } else if (state.mouseButton === THREE.MOUSE.RIGHT && state.double) {
        return 'dblclick-right';
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
                                    * a given position. The choice of the target position is made in the Controls
                                    * associated to this StateControl.
                                    * This state can only be associated to double click on mouse buttons (left or right)
                                    * or a keyboard key.
 * @property {State}    TRAVEL_OUT  {@link State} describing camera travel out movement : the camera is zoomed out from
                                    * a given position. The choice of the target position is made in the Controls
                                    * associated to this StateControl.
                                    * This state can only be associated to double click on mouse buttons (left or right)
                                    * or a keyboard key. It is disabled by default.
 */
class StateControl extends THREE.EventDispatcher {
    constructor(view, options = {}) {
        super();

        this._view = view;
        this._domElement = view.domElement;

        this.NONE = {};

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
     * get the state corresponding to the mouse button and the keyboard key
     * @param      {Number}  mouseButton  The mouse button
     * @param      {Number}  keyboard     The keyboard
     * @param      {Boolean} [double]     Value of the searched state `double` property
     * @return     {State}  the state corresponding
     */
    inputToState(mouseButton, keyboard, double) {
        for (const key of Object.keys(this)) {
            const state = this[key];
            if (state.enable
                && state.mouseButton === mouseButton
                && state.keyboard === keyboard
                && (!double || state.double === double)
            ) {
                return state;
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
        for (const key of Object.keys(this)) {
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

                this[state] = newState;
            }
        }

        this._domElement.addEventListener(stateToTrigger(this.TRAVEL_IN), this._handleTravelInEvent, false);
        this._domElement.addEventListener(stateToTrigger(this.TRAVEL_OUT), this._handleTravelOutEvent, false);
    }

    /**
     * Remove all event listeners created within this instance of `StateControl`
     */
    dispose() {
        this._domElement.removeEventListener(this.TRAVEL_IN.trigger, this._handleTravelInEvent, false);
        this._domElement.removeEventListener(this.TRAVEL_OUT.trigger, this._handleTravelInEvent, false);
    }
}

export default StateControl;
