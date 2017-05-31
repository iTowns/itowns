/* global assert, describe, it */
var itownsTesting = require('./itowns-testing.js');
var example = require('../examples/postprocessing.js');

describe('Postprocessing example', () => {
    it('should render postpressing scene to screen', (done) => {
        example.globeView.mainLoop.gfxEngine.renderer.render = (scene, camera, target) => {
            if (scene == example.postprocessScene) {
                assert.equal(target, undefined);
                done();
                example.globeView.mainLoop.gfxEngine.renderer.render = () => {};
            }
        };
        itownsTesting.runTest();
    });
});


example.globeView.mainLoop.gfxEngine.renderer.fullSizeRenderTarget = {
    texture: {},
    width: 0,
    height: 0,
};

