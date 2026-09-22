import { MOUSE } from 'three';
import assert from 'assert';
import { Coordinates } from '@itowns/geographic';
import GlobeView from 'Core/Prefab/GlobeView';
import Renderer from './bootstrap';

describe('StateControl', () => {
    const renderer = new Renderer();

    const placement = { coord: new Coordinates('EPSG:4326', 2.351323, 48.856712), range: 250000, proxy: false };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });
    const states = viewer.controls.states;

    const event = {
        stopPropagation: () => { },
        preventDefault: () => { },
        target: viewer.domElement,
    };

    function testEventTriggering(eventType, event, actions) {
        let eventTriggered = false;

        states.addEventListener(eventType, () => { eventTriggered = true; });

        actions(event);

        return eventTriggered;
    }

    it('inputToState should return the correct state', () => {
        assert.strictEqual(
            JSON.stringify(states.inputToState(MOUSE.LEFT, 17)),
            JSON.stringify(states.ORBIT),
        );
    });

    it('inputToState should return NONE state if matching state is disabled', () => {
        states.ORBIT.enable = false;
        assert.strictEqual(
            JSON.stringify(states.inputToState(MOUSE.LEFT, 17)),
            JSON.stringify(states.NONE),
        );
        states.ORBIT.enable = true;
    });

    it('touchToState should return the correct state', () => {
        assert.strictEqual(
            JSON.stringify(states.touchToState(3)),
            JSON.stringify(states.PAN),
        );
    });

    it('touchToState should return NONE state if matching state is disabled', () => {
        states.PAN.enable = false;
        assert.strictEqual(
            JSON.stringify(states.touchToState(3)),
            JSON.stringify(states.NONE),
        );
        states.PAN.enable = true;
    });

    it('setFromOptions should set states according to given options', () => {
        const options = {
            PAN: { enable: false, double: false },
            MOVE_GLOBE: { enable: true, double: false, mouseButton: MOUSE.LEFT },
            ORBIT: { enable: true, double: false, mouseButton: MOUSE.MIDDLE },
            DOLLY: { enable: true, double: false, mouseButton: MOUSE.RIGHT },
            PANORAMIC: { enable: true, double: false, mouseButton: MOUSE.LEFT, keyboard: 17 },
            TRAVEL_IN: { enable: true, double: true, mouseButton: MOUSE.LEFT },
            TRAVEL_OUT: { enable: true, double: true, mouseButton: MOUSE.RIGHT },
        };
        states.setFromOptions(options);

        assert.strictEqual(JSON.stringify(options.PAN), JSON.stringify(states.PAN));
        assert.strictEqual(JSON.stringify(options.MOVE_GLOBE), JSON.stringify(states.MOVE_GLOBE));
        assert.strictEqual(JSON.stringify(options.ORBIT), JSON.stringify(states.ORBIT));
        assert.strictEqual(JSON.stringify(options.DOLLY), JSON.stringify(states.DOLLY));
        assert.strictEqual(JSON.stringify(options.PANORAMIC), JSON.stringify(states.PANORAMIC));
        assert.strictEqual(JSON.stringify(options.TRAVEL_IN), JSON.stringify(states.TRAVEL_IN));
        assert.strictEqual(JSON.stringify(options.TRAVEL_OUT), JSON.stringify(states.TRAVEL_OUT));

        // reset states to default, except for TRAVEL_OUT which will be used further on
        states.setFromOptions({
            PAN: { enable: true, mouseButton: MOUSE.RIGHT, finger: 3 },
            ORBIT: { mouseButton: MOUSE.LEFT, keyboard: 17 },
            DOLLY: { mouseButton: MOUSE.MIDDLE },
            PANORAMIC: { mouseButton: MOUSE.LEFT, keyboard: 16 },
        });
    });

    it('should trigger state-changed event from left-click', () => {
        event.pointerType = 'mouse';
        event.button = MOUSE.LEFT;
        event.offsetX = 100;
        event.offsetY = 100;

        assert(testEventTriggering('state-changed', event, states._onPointerDown));
    });

    it('should trigger drag event', () => {
        assert(testEventTriggering('drag', event, states._onPointerMove));
        states._onPointerUp();
    });

    it('should trigger state-changed event from ctrl + left-click', () => {
        event.keyCode = 17;

        assert(testEventTriggering('state-changed', event, (event) => {
            states._onKeyDown(event);
            states._onPointerDown(event);
        }));
    });

    it('should trigger rotate event', () => {
        assert(testEventTriggering('rotate', event, states._on.pointermove));
        states._onPointerUp();
        states._onKeyUp();
    });

    it('should trigger state-changed event from middle click', () => {
        event.button = MOUSE.MIDDLE;

        assert(testEventTriggering('state-changed', event, states._on.pointerdown));
    });

    it('should trigger dolly event', () => {
        assert(testEventTriggering('dolly', event, states._on.pointermove));
        states._onPointerUp();
    });

    it('should trigger state-changed event from right-click', () => {
        event.button = MOUSE.RIGHT;

        assert(testEventTriggering('state-changed', event, states._on.pointerdown));
    });

    it('should trigger pan event', () => {
        assert(testEventTriggering('pan', event, states._on.pointermove));
        states.onPointerUp();
    });

    it('should trigger pan event from up arrow key press', () => {
        event.button = undefined;

        // UP arrow key
        event.keyCode = 38;
        assert(testEventTriggering('pan', event, states._on.keydown));
        states._onKeyUp();
    });

    it('should trigger pan event from bottom arrow key press', () => {
        // BOTTOM arrow key
        event.keyCode = 40;
        assert(testEventTriggering('pan', event, states._on.keydown));
        states._onKeyUp();
    });

    it('should trigger pan event from left arrow key press', () => {
        // LEFT arrow key
        event.keyCode = 37;
        assert(testEventTriggering('pan', event, states._on.keydown));
        states._onKeyUp();
    });

    it('should trigger pan event from right arrow key press', () => {
        // RIGHT arrow key
        event.keyCode = 39;
        assert(testEventTriggering('pan', event, states._on.keydown));
        states._onKeyUp();
    });

    it('should trigger state-changed event from shift + left-click', () => {
        event.button = MOUSE.LEFT;
        event.keyCode = 16;

        assert(testEventTriggering('state-changed', event, (event) => {
            states._onKeyDown(event);
            states._onPointerDown(event);
        }));
    });

    it('should trigger panoramic event', () => {
        assert(testEventTriggering('panoramic', event, states._on.pointermove));
        states._onPointerUp();
        states._onKeyUp();
    });

    it('should trigger travel_in event from mouse event', () => {
        assert(testEventTriggering('travel_in', event, (event) => {
            event.timeStamp = 100;
            states._onPointerDown(event);
            states._onPointerUp();
            event.timeStamp = 200;
            states._onPointerDown(event);
            states._onPointerUp();
        }));
    });

    it('should trigger travel_in event from keyboard event', () => {
        states.setFromOptions({
            TRAVEL_IN: {
                keyboard: 80,
            },
        });

        event.button = undefined;
        event.keyCode = 80;

        assert(testEventTriggering('travel_in', event, states._on.keydown));
        states._onKeyUp();
    });

    it('should no longer trigger travel_in event from mouse event', () => {
        event.button = MOUSE.LEFT;
        event.keyCode = undefined;

        assert(!testEventTriggering('travel_in', event, (event) => {
            event.timeStamp = 700;
            states._onPointerDown(event);
            states._onPointerUp(event);
            event.timeStamp = 800;
            states._onPointerDown(event);
            states._onPointerUp(event);
        }));
    });

    it('should trigger travel_out event from mouse event', () => {
        event.button = MOUSE.RIGHT;

        assert(testEventTriggering('travel_out', event, (event) => {
            event.timeStamp = 1300;
            states._onPointerDown(event);
            states._onPointerUp();
            event.timeStamp = 1400;
            states._onPointerDown(event);
            states._onPointerUp();
        }));
    });

    it('should trigger travel_out event from keyboard event', () => {
        states.setFromOptions({
            TRAVEL_OUT: {
                keyboard: 77,
                double: false,
            },
        });

        event.button = undefined;
        event.keyCode = 77;

        assert(testEventTriggering('travel_out', event, states._on.keydown));
        states._onKeyUp();
    });

    it('should no longer trigger travel_out event from mouse event', () => {
        event.button = MOUSE.RIGHT;
        event.keyCode = undefined;

        assert(!testEventTriggering('travel_out', event, (event) => {
            event.timeStamp = 1900;
            states._onPointerDown(event);
            states._onPointerUp(event);
            event.timeStamp = 2000;
            states._onPointerDown(event);
            states._onPointerUp(event);
        }));
    });

    it('should trigger zoom event from wheel event', () => {
        assert(testEventTriggering('zoom', event, states._on.wheel));
    });

    it('should not trigger zoom event if zoom trigger is disabled', () => {
        states.ZOOM.enable = false;
        assert(!testEventTriggering('zoom', event, states._on.wheel));
        states.ZOOM.enable = true;
    });

    it('blur event should resume currentState to NONE', () => {
        states.currentState = states.MOVE_GLOBE;
        states._on.blur(event);
        assert.ok(states.NONE === states.currentState);
    });

    it('context menu should not appear', () => {
        states.onContextMenu(event);
    });

    it('should not trigger anything if StateControl is disabled', () => {
        states.enabled = false;

        assert(!testEventTriggering('state-changed', event, (event) => {
            // Single left click
            event.button = MOUSE.LEFT;
            states._onPointerDown(event);
            states._onPointerUp();

            // Single right click
            event.button = MOUSE.RIGHT;
            states._onPointerDown(event);
            states._onPointerUp();

            // Single middle click
            event.button = MOUSE.MIDDLE;
            states._onPointerDown(event);
            states._onPointerUp();
        }));

        event.button = undefined;
        assert(!testEventTriggering('travel_in', event, (event) => {
            event.keyCode = 80;
            states._onKeyDown(event);
            states._onKeyUp();
        }));

        assert(!testEventTriggering('travel_in', event, (event) => {
            event.keyCode = 77;
            states._onKeyDown(event);
            states._onKeyUp();
        }));

        assert(!testEventTriggering('pan', event, (event) => {
            // Left arrow key
            event.keyCode = 37;
            states._onKeyDown(event);
            states._onKeyUp();

            // Up arrow key
            event.keyCode = 38;
            states._onKeyDown(event);
            states._onKeyUp();

            // Right arrow key
            event.keyCode = 39;
            states._onKeyDown(event);
            states._onKeyUp();

            // Bottom arrow key
            event.keyCode = 40;
            states._onKeyDown(event);
            states._onKeyUp();
        }));

        assert(!testEventTriggering('zoom', event, states._on.wheel));

        states.enabled = true;
    });

    it('should dispose event listeners', () => {
        states.dispose();
    });
});
