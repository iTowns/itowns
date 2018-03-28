/* global itowns, assert, describe, it */
var itownsTesting = require('./itowns-testing.js');
var example = require('../examples/globe.js');

var initialState = 0;


describe('wmts', function () {
    it('should fetch like expected for wmts', function (done) {
        itownsTesting.counters.visible_at_level = [];
        let layer;
        const listener = () => {
            if (initialState == 0) {
                initialState++;
                layer = example.view.getLayers(l => l.id == 'Ortho')[0];
                layer.options.zoom.max = 8;

                example.view.camera.camera3D.position.copy(
                    new itowns.Coordinates('EPSG:4326',
                        example.initialPosition.longitude,
                        example.initialPosition.latitude,
                        10000).as('EPSG:4978').xyz());
                example.view.notifyChange(true);
            } else if (initialState < 5) {
                initialState++;
            } else {
                for (var obj of example.view.wgs84TileLayer.level0Nodes) {
                    itownsTesting.countVisibleAndDisplayedLayerImage(obj, 'Ortho');
                }
                assert.equal(layer.options.zoom.max, itownsTesting.counters.visible_at_level.length - 1);
                assert.equal(itownsTesting.counters.visible_at_level[8], 2);
                assert.equal(itownsTesting.counters.visible_at_level[7], 0);
                example.view.mainLoop.removeEventListener('command-queue-empty', listener);
                done();
                process.exit(0);
            }
        };
        example.view.mainLoop.addEventListener('command-queue-empty', listener);
        itownsTesting.runTest();
    });
});

