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
                && state.double === double
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
     *
     * @example
     * // Switch bindings for PAN and MOVE_GLOBE actions :
     * view.controls.states.setFromOptions({
     *     PAN: {
     *        enable: true,
     *        mouseButton: itowns.THREE.MOUSE.LEFT,
     *     },
     *     MOVE_GLOBE: {
     *         enable: true,
     *         mouseButton: itowns.THREE.MOUSE.RIGHT,
     *     },
     * };
     */
    setFromOptions(options) {
        this.ORBIT = options.ORBIT || this.ORBIT || {
            mouseButton: THREE.MOUSE.LEFT,
            keyboard: CONTROL_KEYS.CTRL,
            enable: true,
            finger: 2,
        };
        this.DOLLY = options.DOLLY || this.DOLLY || {
            mouseButton: THREE.MOUSE.MIDDLE,
            enable: true,
        };
        this.PAN = options.PAN || this.PAN || {
            mouseButton: THREE.MOUSE.RIGHT,
            up: CONTROL_KEYS.UP,
            bottom: CONTROL_KEYS.BOTTOM,
            left: CONTROL_KEYS.LEFT,
            right: CONTROL_KEYS.RIGHT,
            enable: true,
            finger: 3,
        };
        this.MOVE_GLOBE = options.MOVE_GLOBE || this.MOVE_GLOBE || {
            mouseButton: THREE.MOUSE.LEFT,
            enable: true,
            finger: 1,
        };
        this.PANORAMIC = options.PANORAMIC || this.PANORAMIC || {
            mouseButton: THREE.MOUSE.LEFT,
            keyboard: CONTROL_KEYS.SHIFT,
            enable: true,
        };

        const newTravelIn = options.TRAVEL_IN || this.TRAVEL_IN || {
            enable: true,
            mouseButton: THREE.MOUSE.LEFT,
            double: true,
        };

        this._domElement.removeEventListener(stateToTrigger(this.TRAVEL_IN), this._handleTravelInEvent, false);
        this._domElement.addEventListener(stateToTrigger(newTravelIn), this._handleTravelInEvent, false);
        this.TRAVEL_IN = newTravelIn;

        const newTravelOut = options.TRAVEL_OUT || this.TRAVEL_OUT || {
            enable: false,
        };
        this._domElement.removeEventListener(stateToTrigger(this.TRAVEL_OUT), this._handleTravelOutEvent, false);
        this._domElement.addEventListener(stateToTrigger(newTravelOut), this._handleTravelOutEvent, false);
        this.TRAVEL_OUT = newTravelOut;
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
