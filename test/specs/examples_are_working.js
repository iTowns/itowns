/* global browser, view, describe, it */
const assert = require('assert');
const fs = require('fs');

browser.timeouts('script', 120000);

function _test(url) {
    browser.url(`http://localhost:8080/${url}`);
    var result = browser.executeAsync(
        function (done) {
            view.mainLoop.addEventListener('command-queue-empty',
                function () {
                    if (view.mainLoop.gfxEngine.renderer.info.render.calls > 0) {
                        return done(true);
                    }
                });
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
