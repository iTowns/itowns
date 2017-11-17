/* global browser, view, describe, it */
const assert = require('assert');
const fs = require('fs');

function _test(url) {
    browser.url(`http://localhost:8080/${url}`);

    // waits for 'view' to exist...
    browser.waitUntil(function () {
        return browser.execute(function () {
            return typeof (view) !== 'undefined';
        }).value;
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
            }
            var u = {
                update: check,
            };
            view.addFrameRequester(u);
            view.notifyChange(true);
        });

    assert.ok(result.value, 'MainLoop jobs should be all done at some point');
}

// list examples
fs.readdirSync('examples/').forEach((file) => {
    if (file === 'index.html') {
        return;
    }
    if (file.indexOf('.html') > 0) {
        describe(`Example ${file}`, function () {
            it('Should load and run', function () {
                _test(`examples/${file}`);
            });
        });
    }
});
