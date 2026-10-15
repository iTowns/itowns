import type View from 'Core/View';
import * as THREE from 'three';

// Helper because Object.entries erases key type information
export function objectEntries<
    T extends Record<PropertyKey, unknown>,
    K extends keyof T,
    V extends T[K],
>(o: T) {
    return Object.entries(o) as [K, Exclude<V, undefined>][];
}

// Helper because Object.keys erases key type information
export function objectKeys<
    T extends Record<PropertyKey, unknown>,
    K extends keyof T,
>(o: T) {
    return Object.keys(o) as K[];
}

const CONTROL_KEYS = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40,
    SPACE: 32,
    SHIFT: 16,
    CTRL: 17,
    META: 91,
    S: 83,
} as const;
type CONTROL_KEYS = typeof CONTROL_KEYS[keyof typeof CONTROL_KEYS];

interface StateOptions {
    mouseButton: THREE.MOUSE;
    keyboard: CONTROL_KEYS;
    finger: 1 | 2 | 3;
    double: boolean;
    trigger: boolean;
    direction: string;
}

export type Event = 'drag' | 'rotate' | 'pan' | 'dolly' | 'panoramic' | 'travel_out' | 'travel_in' | 'zoom';

export class State {
    public enable: boolean;
    public mouseButton?: THREE.MOUSE;
    /** Numerical key code */
    public keyboard?: CONTROL_KEYS;
    /** Number of fingers on the touchpad */
    public finger?: 1 | 2 | 3;
    /** State requires a double press */
    public double?: boolean;

    private _trigger?: boolean;
    private _direction?: string;

    public constructor(
        private _event: Event | null,
        options: Partial<StateOptions> = {},
    ) {
        this.enable = true;
        this.double = options.double;
        this.finger = options.finger;
        this._trigger = options.trigger;
        this._direction = options.direction;
        this.keyboard = options.keyboard;
        this.mouseButton = options.mouseButton;
    }

    get event() {
        return this._event;
    }

    get trigger() {
        return this._trigger;
    }

    get direction() {
        return this._direction;
    }
}

const DEFAULT_STATES = {
    NONE: new State(null, {}),
    ORBIT: new State('rotate', {
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        keyboard: CONTROL_KEYS.CTRL,
        finger: 2,
    }),
    MOVE_GLOBE: new State('drag', {
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        finger: 1,
    }),
    DOLLY: new State('dolly', {
        mouseButton: THREE.MOUSE.MIDDLE,
        double: false,
        finger: 2,
    }),
    PAN: new State('pan', {
        mouseButton: THREE.MOUSE.RIGHT,
        double: false,
        finger: 3,
    }),
    PANORAMIC: new State('panoramic', {
        mouseButton: THREE.MOUSE.LEFT,
        double: false,
        keyboard: CONTROL_KEYS.SHIFT,
    }),
    TRAVEL_IN: new State('travel_in', {
        mouseButton: THREE.MOUSE.LEFT,
        double: true,
        trigger: true,
        direction: 'in',
    }),
    TRAVEL_OUT: new State('travel_out', {
        double: false,
        trigger: true,
        direction: 'out',
    }),
    ZOOM: new State('zoom', {
        trigger: true,
    }),
};

const viewCoords = new THREE.Vector2();

interface StateControlEvents {
    'state-changed': { viewCoords: THREE.Vector2; previous: State };
    rotate: { viewCoords: THREE.Vector2 };
    drag: { viewCoords: THREE.Vector2 };
    dolly: { viewCoords: THREE.Vector2 };
    pan: { viewCoords: THREE.Vector2 };
    panoramic: { viewCoords: THREE.Vector2 };
    // NOTE: When adding a new trigger event, also add it to the cast in inputToState.
    travel_in: { viewCoords?: THREE.Vector2; direction?: string };
    travel_out: { viewCoords?: THREE.Vector2; direction?: string };
    zoom: { viewCoords?: THREE.Vector2; direction?: string; delta?: number };
};

/**
 * It represents the control's states.
 * Each {@link State} is a control mode of the camera and how to interact with
 * the interface to activate this mode.
 */
class StateControl extends THREE.EventDispatcher<StateControlEvents> {
    private _view: View;
    private _domElement: HTMLElement;

    private _clickTimeStamp: number;
    private _lastMousePressed: { button?: number; viewCoords: THREE.Vector2 };
    private _currentMousePressed?: number;
    private _currentKeyPressed?: number;

    private _enabled = true;
    private _enableKeys = true;
    private _currentState: State;

    // States
    /** When camera is idle. */
    /** {@link State} when camera is idle. */
    public NONE: State = DEFAULT_STATES.NONE;
    /** {@link State} describing camera orbiting movement : the camera moves around its target at a constant distance from it. */
    public ORBIT: State = DEFAULT_STATES.ORBIT;
    /** {@link State} describing camera dolly movement : the camera moves forward or backward from its target. */
    public DOLLY: State = DEFAULT_STATES.DOLLY;
    /** {@link State} describing camera pan movement : the camera moves parallel to the current view plane. */
    public PAN: State = DEFAULT_STATES.PAN;
    /** {@link State} describing camera drag movement : the camera is moved around the view to give the feeling that the view is dragged under a static camera. */
    public MOVE_GLOBE: State = DEFAULT_STATES.MOVE_GLOBE;
    /** {@link State} describing camera panoramic movement : the camera is rotated around its own position. */
    public PANORAMIC: State = DEFAULT_STATES.PANORAMIC;
    /** {@link State} describing camera travel in movement : the camera is zoomed in toward a given position. The target position depends on the key/mouse binding of this state. If bound to a mouse button; the target position is the mouse position. Otherwise; it is the center of the screen. */
    public TRAVEL_IN: State = DEFAULT_STATES.TRAVEL_IN;
    /** {@link State} describing camera travel out movement : the camera is zoomed out from a given position. The target position depends on the key/mouse binding of this state. If bound to a mouse button; the target position is the mouse position. Otherwise; it is the center of the screen. It is disabled by default. */
    public TRAVEL_OUT: State = DEFAULT_STATES.TRAVEL_OUT;
    /** {@link State} describing camera zoom in and out movement. */
    public ZOOM: State = DEFAULT_STATES.ZOOM;

    // this-bound versions of the event handling methods
    // private _on: Partial<{ [Key in keyof HTMLElementEventMap]: (this: this, ev: HTMLElementEventMap[Key]) => unknown }>;

    private _on: {
        pointerdown: (this: StateControl, ev: PointerEvent) => void;
        pointermove: (this: StateControl, ev: PointerEvent) => void;
        pointerup: (this: StateControl, ev: PointerEvent) => void;
        wheel: (this: StateControl, ev: WheelEvent) => void;
        keydown: (this: StateControl, ev: KeyboardEvent) => void;
        keyup: (this: StateControl, ev: KeyboardEvent) => void;
        blur: (this: StateControl) => void;
        contextmenu: (this: StateControl, ev: PointerEvent) => void;
    };

    constructor(view: View, options?: Partial<{ [Name in keyof typeof DEFAULT_STATES]: Partial<typeof DEFAULT_STATES[Name]> }>) {
        super();

        this._view = view;
        this._domElement = view.domElement;

        this._enabled = true;
        this._enableKeys = true;
        this._currentState = this.NONE;

        this._clickTimeStamp = 0;
        this._lastMousePressed = { viewCoords: new THREE.Vector2() };
        this._currentMousePressed = undefined;
        this._currentKeyPressed = undefined;

        this._on = {
            pointerdown: this.onPointerDown.bind(this),
            pointermove: this.onPointerMove.bind(this),
            pointerup: this.onPointerDown.bind(this),
            wheel: this.onMouseWheel.bind(this),
            keydown: this.onKeyDown.bind(this),
            keyup: this.onKeyUp.bind(this),
            // Reset key/mouse when window loose focus
            blur: this.onBlur.bind(this),
            // disable context menu when right-clicking
            contextmenu: this.onContextMenu.bind(this),
        };

        for (const [name, fn] of objectEntries(this._on)) {
            // @ts-expect-error: Binding `this` to the first arg messes up the typing.
            this._domElement.addEventListener(name, fn);
        }

        if (options) {
            this.setFromOptions(options);
        }
    }

    /**
     * Defines whether all input will be communicated to the associated `Controls` or not.
     * Default is true.
     * @returns boolean
     */
    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        if (!value) {
            this.onKeyUp();
            this.onPointerUp();
        }
        this._enabled = value;
    }

    /**
     * Defines whether keyboard input will be communicated to the associated `Controls` or not.
     * Default is true.
     * @returns boolean
     */
    public get enableKeys(): boolean {
        return this._enableKeys;
    }

    public set enableKeys(value: boolean) {
        if (!value) {
            this.onKeyUp();
        }
        this._enableKeys = value;
    }

    public get currentState(): State {
        return this._currentState;
    }

    public set currentState(newState: State) {
        if (this._currentState !== newState) {
            const previous = this._currentState;
            this._currentState = newState;
            this.dispatchEvent({ type: 'state-changed', viewCoords, previous });
        }
    }

    /**
     * get the state corresponding to the mouse button and the keyboard key. If the input relates to a trigger - a
     * single event which triggers movement, without the move of the mouse for instance -, dispatch a relevant event.
     * @param      mouseButton  The mouse button
     * @param      keyboard     The keyboard
     * @param      double     Value of the searched state `double` property
     * @returns    The corresponding state
     */
    inputToState(mouseButton?: number, keyboard?: number, double = false): State | typeof this.NONE {
        for (const key of objectKeys(DEFAULT_STATES)) {
            const state = this[key];
            if (state.enable
                && state.mouseButton === mouseButton
                && state.keyboard === keyboard
                && state.double === double
            ) {
                // If the input relates to a state, returns it
                if (!state.trigger) { return state; }
                // If the input relates to a trigger (TRAVEL_IN, TRAVEL_OUT), dispatch a relevant event.
                this.dispatchEvent({
                    type: state.event as 'travel_in' | 'travel_out' | 'zoom',
                    // Dont pass viewCoords if the input is only a keyboard input.
                    viewCoords: mouseButton ? viewCoords : undefined,
                    direction: state.direction,
                });
            }
        }
        return this.NONE;
    }

    /**
     * Get the state corresponding to the number of fingers on the pad
     *
     * @param fingers The number of fingers
     * @returns The corresponding state
     */
    touchToState(fingers: number): State | typeof this.NONE {
        for (const key of objectKeys(DEFAULT_STATES)) {
            const state = this[key];
            if (state.enable && fingers === state.finger) {
                return state;
            }
        }
        return this.NONE;
    }

    /**
     * Set the current StateControl {@link State} properties to given values.
     * @param  options     Object containing the `State` values to set current `StateControl` properties to.
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
    setFromOptions(options: Partial<Record<keyof typeof DEFAULT_STATES, Partial<State>>>) {
        for (const [state, state_obj] of objectEntries(DEFAULT_STATES)) {
            const partialState: Partial<State> = options[state] || this[state] || Object.assign({}, state_obj);

            // Copy the previous value of `enable` property if not defined in options
            if (options[state] && options[state].enable === undefined) {
                partialState.enable = this[state].enable;
            }

            // If no value is provided for the `double` property,
            // defaults it to `false` instead of leaving it undefined
            partialState.double ??= false;

            const newState = partialState as State;

            // Copy private properties
            newState['_event'] = state_obj.event;
            newState['_trigger'] = state_obj.trigger;
            newState['_direction'] = state_obj.direction;

            this[state] = newState;
        }
    }


    // ---------- POINTER EVENTS : ----------

    onPointerDown(event: PointerEvent) {
        if (!this.enabled) { return; }

        viewCoords.copy(this._view.eventToViewCoords(event));

        switch (event.pointerType) {
            case 'mouse': {
                this._currentMousePressed = event.button;

                if (this._currentKeyPressed === undefined) {
                    if (event.ctrlKey) {
                        this._currentKeyPressed = CONTROL_KEYS.CTRL;
                    } else if (event.shiftKey) {
                        this._currentKeyPressed = CONTROL_KEYS.SHIFT;
                    } else if (event.metaKey) {
                        this._currentKeyPressed = CONTROL_KEYS.META;
                    }
                }
                this.currentState = this.inputToState(
                    this._currentMousePressed,
                    this._currentKeyPressed,
                    // Detect if the mouse button was pressed less than 500 ms before, and if the cursor has not moved two much
                    // since previous click. If so, set dblclick to true.
                    event.timeStamp - this._clickTimeStamp < 500
                    && this._lastMousePressed.button === this._currentMousePressed
                    && this._lastMousePressed.viewCoords.distanceTo(viewCoords) < 5,
                );

                this._clickTimeStamp = event.timeStamp;
                this._lastMousePressed.button = this._currentMousePressed;
                this._lastMousePressed.viewCoords.copy(viewCoords);

                break;
            }
            // TODO : add touch event management
            default:
        }

        // @ts-expect-error: this-binding was a mistake
        this._domElement.addEventListener('pointermove', this._on.pointermove, false);
        // @ts-expect-error: this-binding was a mistake
        this._domElement.addEventListener('pointerup', this._on.pointerup, false);
        // @ts-expect-error: this-binding was a mistake
        this._domElement.addEventListener('mouseleave', this._on.pointerup, false);
    }

    onPointerMove(event: PointerEvent) {
        event.preventDefault();
        if (!this.enabled) { return; }

        viewCoords.copy(this._view.eventToViewCoords(event));

        switch (event.pointerType) {
            case 'mouse':
                if (!this.currentState.event) { break; }
                this.dispatchEvent({ type: this.currentState.event, viewCoords });
                break;
            // TODO : add touch event management
            default:
        }
    }

    onPointerUp() {
        if (!this.enabled) { return; }
        this._currentMousePressed = undefined;

        // @ts-expect-error: this-binding was a mistake
        this._domElement.removeEventListener('pointermove', this._on.pointermove, false);
        // @ts-expect-error: this-binding was a mistake
        this._domElement.removeEventListener('pointerup', this._on.pointerup, false);
        // @ts-expect-error: this-binding was a mistake
        this._domElement.removeEventListener('mouseleave', this._on.pointerup, false);

        this.currentState = this.NONE;
    }


    // ---------- WHEEL EVENT : ----------

    onMouseWheel(event: WheelEvent) {
        event.preventDefault();

        if (this.enabled && this.ZOOM.enable) {
            viewCoords.copy(this._view.eventToViewCoords(event));
            this.currentState = this.ZOOM;
            this.dispatchEvent({ type: this.ZOOM.event as Event, delta: event.deltaY, viewCoords });
        }
    }


    // ---------- KEYBOARD EVENTS : ----------

    onKeyDown(event: KeyboardEvent) {
        if (!this.enabled || !this.enableKeys) { return; }
        this._currentKeyPressed = event.keyCode;

        this.inputToState(this._currentMousePressed, this._currentKeyPressed);
    }

    onKeyUp() {
        if (!this.enabled || !this.enableKeys) { return; }
        this._currentKeyPressed = undefined;
        if (this._currentMousePressed === undefined) {
            this.currentState = this.NONE;
        }
    }

    onBlur() {
        this.onKeyUp();
        this.onPointerUp();
    }

    onContextMenu(event: PointerEvent) {
        event.preventDefault();
    }

    /**
     * Remove all event listeners created within this instance of `StateControl`
     */
    dispose() {
        this._clickTimeStamp = 0;
        this._lastMousePressed.button = undefined;
        this._currentKeyPressed = undefined;

        for (const [name, fn] of objectEntries(this._on)) {
            // @ts-expect-error: this-binding was a mistake
            this._domElement.removeEventListener(name, fn, false);
        }
    }
}

export default StateControl;
