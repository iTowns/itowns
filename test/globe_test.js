/* global itowns, assert, describe, it */
var itownsTesting = require('./itowns-testing.js');
var example = require('../examples/globe.js');

function initialStateTest() {
    assert.equal(itownsTesting.counters.displayed_at_level[2], 26);

    // cant' write this because it's using PM textures
    // var orthoFetchCount = itownsTesting.counters.fetch.filter(u => u.indexOf('ORTHO') >= 0).length;
    // assert.ok(orthoFetchCount <= itownsTesting.counters.visible_at_level[1] + itownsTesting.counters.visible_at_level[2]);
}

function afterSetRange() {
    // Our mock fetch() do not return proper elevation data, so to compute
    // the expected value the elevation layer needs to be disabled
    assert.equal(itownsTesting.counters.displayed_at_level[12], 5);
    assert.equal(itownsTesting.counters.displayed_at_level[13], 4);
}

var initialState = true;

describe('Globe example', function () {
    it('should subdivide like expected', function (done) {
        example.view.mainLoop.addEventListener('command-queue-empty', () => {
            itownsTesting.counters.visible_at_level = [];
            itownsTesting.counters.displayed_at_level = [];

            for (var obj of example.view.baseLayer.level0Nodes) {
                itownsTesting.countVisibleAndDisplayed(obj);
            }

            if (initialState) {
                initialStateTest();
                initialState = false;

                example.view.camera.camera3D.position.copy(
                    new itowns.Coordinates('EPSG:4326',
                        example.initialPosition.longitude,
                        example.initialPosition.latitude,
                        10000).as('EPSG:4978').xyz());
                example.view.notifyChange(true);
            } else {
                afterSetRange();
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

