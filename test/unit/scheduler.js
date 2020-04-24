import assert from 'assert';
import Scheduler from 'Core/Scheduler/Scheduler';

describe('Command execution', function () {
    const scheduler = new Scheduler();

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
                priority: prio,
            },
            view,
        };
    }

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

    it('should execute balance commands between layers', function (done) {
        const results = [];
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(scheduler.execute(cmd('layer0', 1)).then(
                (c) => { results.push(c.layer.id); }));
            promises.push(scheduler.execute(cmd('layer1', 5)).then(
                (c) => { results.push(c.layer.id); }));
            promises.push(scheduler.execute(cmd('layer2', 10)).then(
                (c) => { results.push(c.layer.id); }));
        }

        Promise.all(promises).then(() => {
            // layer2 commands must be all finished before layer1 commands
            assert.ok(results.lastIndexOf('layer2') < results.lastIndexOf('layer1'));
            // layer1 commands must be all finished before layer0 commands
            assert.ok(results.lastIndexOf('layer1') < results.lastIndexOf('layer0'));
            done();
        });
    });
});
