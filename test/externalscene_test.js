/* global assert, describe, it */
var itownsTesting = require('./itowns-testing.js');
var example = require('../examples/externalscene.js');

describe('External Scene', function () {
    this.timeout(10000);
    it('should use the user constructed scene', function (done) {
        example.globeView.mainLoop.addEventListener('command-queue-empty', () => {
            assert.equal(example.globeView.scene, example.scene);
            if (itownsTesting.counters.fetch.length > 0) {
                done();
                // 'command-queue-empty' can fire multiple times, because GlobeView
                // fires a notifyChange() event when it receives 'command-queue-empty'
                // Until this is fixed, we exit() the test here, to make sure we don't
                // call done() twice
                process.exit(0);
            }
        });
        itownsTesting.runTest();
    });
});
