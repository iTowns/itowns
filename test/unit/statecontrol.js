import { MOUSE } from 'three';
import assert from 'assert';
import StateControl from 'Controls/StateControl';

describe('StateControl', function () {
    const states = new StateControl();

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
        };
        states.setFromOptions(options);

        assert.strictEqual(JSON.stringify(options.PAN), JSON.stringify(states.PAN));
        assert.strictEqual(JSON.stringify(options.MOVE_GLOBE), JSON.stringify(states.MOVE_GLOBE));
        assert.strictEqual(JSON.stringify(options.ORBIT), JSON.stringify(states.ORBIT));
        assert.strictEqual(JSON.stringify(options.DOLLY), JSON.stringify(states.DOLLY));
        assert.strictEqual(JSON.stringify(options.PANORAMIC), JSON.stringify(states.PANORAMIC));
    });
});
