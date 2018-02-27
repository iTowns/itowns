/* global describe, it */
import assert from 'assert';
import Scheduler from '../src/Core/Scheduler/Scheduler';

const scheduler = new Scheduler();
global.window = {
    addEventListener() {},
    setTimeout,
};

scheduler.addProtocolProvider('test', {
    preprocessDataLayer: () => {
    },
    executeCommand: (cmd) => {
        setTimeout(() => {
            cmd.done = true;
            cmd._r(cmd);
        }, 0);
        return new Promise((resolve) => {
            cmd._r = resolve;
        });
    },
});

const view = {
    notifyChange: () => {},
};

function cmd(layerId = 'foo', prio = 0) {
    return {
        layer: {
            id: layerId,
            protocol: 'test',
        },
        view,
        priority: prio,
    };
}

describe('Command execution', function () {
    it('should execute one command', function (done) {
        scheduler.execute(cmd()).then((c) => {
            assert.ok(c.done);
            done();
        });
    });

    it('should execute 100 commands', function (done) {
        const promises = [];
        for (let i = 0; i < 100; i++) {
            promises.push(scheduler.execute(cmd()));
        }

        Promise.all(promises).then((commands) => {
            for (const cmd of commands) {
                assert.ok(cmd.done);
            }
            done();
        });
    });
});
