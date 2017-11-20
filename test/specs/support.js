/* global browser, view */
const assert = require('assert');

function basicTest(url) {
    browser.url(`http://localhost:8080/${url}`);

    // waits for 'view' to exist...
    browser.waitUntil(function () {
        return browser.execute(function () {
            return typeof (view) !== 'undefined';
        }, 10000).value;
    });

    // then run the test
    var result = browser.executeAsync(
        function (done) {
            function check() {
                if (view._layers.length == 0) {
                    return;
                }
                if (view.mainLoop.gfxEngine.renderer.info.render.calls > 0) {
                    return done(true);
                }
                view.notifyChange(true);
            }
            var u = {
                update: check,
            };
            view.addFrameRequester(u);
            view.notifyChange(true);
        });

    assert.ok(result.value, 'MainLoop jobs should be all done at some point');
}

module.exports.basicTest = basicTest;
