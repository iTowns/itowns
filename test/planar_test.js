/* global assert, describe, it */
var itownsTesting = require('./itowns-testing.js');
var example = require('../examples/planar.js');

describe('Planar example', function () {
    it('should run...', (done) => {
        example.view.mainLoop.addEventListener('command-queue-empty', () => {
            if (example.view._changeSources.size > 0) {
                return;
            }
            itownsTesting.counters.displayed_at_level = [];

            for (var obj of example.view.tileLayer.level0Nodes) {
                itownsTesting.countVisibleAndDisplayed(obj);
            }

            assert.equal(itownsTesting.counters.displayed_at_level[2], 7);
            assert.equal(itownsTesting.counters.displayed_at_level[3], 8);
            assert.equal(itownsTesting.counters.displayed_at_level[4], 16);

            done();
        });
        itownsTesting.runTest();
    });
});
