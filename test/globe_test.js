/* global itowns, assert, describe, it */
var itownsTesting = require('./itowns-testing.js');
// eslint-disable-next-line import/no-dynamic-require
var TileMesh = require(`${process.env.PWD}/lib/Core/TileMesh.js`).default;
var THREE = require('three');

var fnsetTextureElevation = TileMesh.prototype.setTextureElevation;
var maxDiffNodeLevelElevationZoom = 0;
TileMesh.prototype.setTextureElevation = function setTextureElevation(elevation) {
    fnsetTextureElevation.bind(this)(elevation);
    maxDiffNodeLevelElevationZoom = Math.max(maxDiffNodeLevelElevationZoom, this.level - elevation.texture.coords.zoom);
};

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
var initialState2 = 0;

describe('Globe example', function () {
    it('should subdivide like expected', function (done) {
        const listener = () => {
            if (example.view._changeSources.size > 0) {
                return;
            }
            itownsTesting.counters.visible_at_level = [];
            itownsTesting.counters.displayed_at_level = [];

            for (var obj of example.view.wgs84TileLayer.level0Nodes) {
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
                example.view.mainLoop.removeEventListener('command-queue-empty', listener);
                done();
            }
        };
        example.view.mainLoop.addEventListener('command-queue-empty', listener);
        itownsTesting.runTest();
    });
    it('should subdivide like expected and prevent to subdivide for poor elevation level', function (done) {
        example.view.mainLoop.addEventListener('command-queue-empty', () => {
            if (example.view._changeSources.size > 0) {
                return;
            }
            if (initialState2 == 0) {
                initialState2++;
                example.view.camera.camera3D.position.copy(
                    new itowns.Coordinates('EPSG:4326',
                        example.initialPosition.longitude,
                        example.initialPosition.latitude,
                        1000).as('EPSG:4978').xyz());
                example.view.notifyChange(true);
            } else if (initialState2 == 1) {
                initialState2++;
                example.view.camera.camera3D.position.copy(
                    new itowns.Coordinates('EPSG:4326',
                        example.initialPosition.longitude + 5,
                        example.initialPosition.latitude + 3,
                        1000).as('EPSG:4978').xyz());
                example.view.camera.camera3D.lookAt(new THREE.Vector3());
                example.view.notifyChange(true);
            } else {
                // should subdivide like expected with not too important elevation zoom eccarts
                assert.equal(maxDiffNodeLevelElevationZoom, 4);
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

