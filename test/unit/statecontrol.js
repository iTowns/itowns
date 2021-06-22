import { MOUSE } from 'three';
import assert from 'assert';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import Renderer from './bootstrap';

describe('StateControl', function () {
    const renderer = new Renderer();

    const placement = { coord: new Coordinates('EPSG:4326', 2.351323, 48.856712), range: 250000, proxy: false };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });
    const states = viewer.controls.states;

    it('inputToState should return the correct state', function () {
        assert.strictEqual(
            JSON.stringify(states.inputToState(MOUSE.LEFT, 17)),
            JSON.stringify(states.ORBIT),
        );
    });

    it('inputToState should return NONE state if matching state is disabled', function () {
        states.ORBIT.enable = false;
        assert.strictEqual(
            JSON.stringify(states.inputToState(MOUSE.LEFT, 17)),
            JSON.stringify(states.NONE),
        );
        states.ORBIT.enable = true;
    });

    it('touchToState should return the correct state', function () {
        assert.strictEqual(
            JSON.stringify(states.touchToState(3)),
            JSON.stringify(states.PAN),
        );
    });

    it('touchToState should return NONE state if matching state is disabled', function () {
        states.PAN.enable = false;
        assert.strictEqual(
            JSON.stringify(states.touchToState(3)),
            JSON.stringify(states.NONE),
        );
        states.PAN.enable = true;
    });

    it('setFromOptions should set states according to given options', function () {
        const options = {
            PAN: { enable: false },
            MOVE_GLOBE: { enable: true, mouseButton: MOUSE.LEFT },
            ORBIT: { enable: true, mouseButton: MOUSE.MIDDLE },
            DOLLY: { enable: true, mouseButton: MOUSE.RIGHT },
            PANORAMIC: { enable: true, mouseButton: MOUSE.LEFT, keyboard: 17 },
            TRAVEL_IN: { enable: true, mouseButton: MOUSE.LEFT, double: true },
        };
        states.setFromOptions(options);

        assert.strictEqual(JSON.stringify(options.PAN), JSON.stringify(states.PAN));
        assert.strictEqual(JSON.stringify(options.MOVE_GLOBE), JSON.stringify(states.MOVE_GLOBE));
        assert.strictEqual(JSON.stringify(options.ORBIT), JSON.stringify(states.ORBIT));
        assert.strictEqual(JSON.stringify(options.DOLLY), JSON.stringify(states.DOLLY));
        assert.strictEqual(JSON.stringify(options.PANORAMIC), JSON.stringify(states.PANORAMIC));
        assert.strictEqual(JSON.stringify(options.TRAVEL_IN), JSON.stringify(states.TRAVEL_IN));
    });

    it('should dispose event listeners', function () {
        states.dispose();
    });
});
