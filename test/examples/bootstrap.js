/* global process, Promise */
// eslint-disable-next-line import/no-extraneous-dependencies
const puppeteer = require('puppeteer');
const { TimeoutError } = require('puppeteer/Errors');
const net = require('net');
const fs = require('fs');
const http = require('http');

// We could run 'npm start' to serve itowns for the tests,
// but it's slow to start (so tests might fail on timeouts).
// Since the 'test-examples' target depends on the 'run' target,
// we instead run the simplest http server.
function startStaticFileServer() {
    return new Promise((resolve) => {
        const ext2mime = new Map();
        ext2mime.set('html', 'text/html');
        ext2mime.set('js', 'text/javascript');
        ext2mime.set('css', 'text/css');
        ext2mime.set('json', 'application/json');

        const server = http.createServer((req, res) => {
            const file = `./${req.url}`;
            fs.readFile(file, (err, data) => {
                if (err) {
                    res.writeHead(500);
                } else {
                    const extension = file.substr(file.lastIndexOf('.') + 1);
                    if (ext2mime.has(extension)) {
                        res.writeHead(200, { 'Content-Type': ext2mime.get(extension) });
                    }
                    res.end(data);
                }
            });
        });

        server.listen(0, () => {
            resolve(server.address().port);
        });

        global.itownsServer = server;
    });
}

function _waitServerReady(port, resolve) {
    const client = net.createConnection({ port }, () => {
        resolve(port);
    });
    client.on('error', () => {
        setTimeout(() => {
            _waitServerReady(port, resolve);
        }, 100);
    });
}

function waitServerReady(port) {
    return new Promise((resolve) => {
        _waitServerReady(port, resolve);
    });
}

async function saveScreenshot(page, screenshotName) {
    if (process.env.SCREENSHOT_FOLDER && screenshotName) {
        const sanitized = screenshotName.replace(/[^\w_]/g, '_');
        const file = `${process.env.SCREENSHOT_FOLDER}/${sanitized}.png`;
        await page.screenshot({ path: file });
        console.log('Wrote ', file);
    }
}

before(async () => {
    let server;
    if (!process.env.USE_DEV_SERVER) {
        server = startStaticFileServer();
    } else {
        server = waitServerReady(process.env.USE_DEV_SERVER);
    }

    // wait for the server to be ready
    global.itownsPort = await server;

    // global variable stored for resetting the page state
    global.initialPosition = {};

    const layersAreInitialized = async () => {
        await page.waitFor(() => view.mainLoop.scheduler.commandsWaitingExecutionCount() === 0
            && view.mainLoop.renderingState === 0
            && view.getLayers().every(layer => layer.ready), { timeout: 20000 });
    };

    // Helper function: returns true when all layers are
    // ready and rendering has been done
    global.loadExample = async (url, screenshotName) => {
        page.setViewport({ width: 400, height: 300 });

        await page.goto(url);

        await page.waitFor(() => typeof (view) === 'object');

        await page.evaluate(() => {
            itowns.CameraUtils.defaultStopPlaceOnGroundAtEnd = true;
        });

        try {
            await layersAreInitialized();
        } catch (e) {
            if (e instanceof TimeoutError) {
                await page.evaluate(() => {
                    itowns.CameraUtils.stop(view, view.camera.camera3D);
                });
                await layersAreInitialized();
            }
        }

        await waitNextRender(page);

        await saveScreenshot(page, screenshotName);

        return true;
    };

    // Use waitUntilItownsIsIdle to wait until itowns has finished all its work (= layer updates)
    global.waitUntilItownsIsIdle = async (screenshotName) => {
        const result = await page.evaluate(() => new Promise((resolve) => {
            itowns.CameraUtils.stop(view, view.camera.camera3D);
            function resolveWhenReady() {
                if (view.mainLoop.renderingState === 0) {
                    view.mainLoop.removeEventListener('command-queue-empty', resolveWhenReady);
                    resolve(true);
                }
            }
            view.mainLoop.addEventListener('command-queue-empty', resolveWhenReady);
        }));

        await waitNextRender(page);

        await saveScreenshot(page, screenshotName);

        return result;
    };

    global.waitNextRender = page => page.evaluate(() => new Promise((resolve) => {
        function resolveWhenDrawn() {
            view.removeFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, resolveWhenDrawn);

            // make sure the loading screen is hidden
            const container = document.getElementById('itowns-loader');
            if (container) {
                container.style.display = 'none';
            }
            const divScaleWidget = document.querySelectorAll('.divScaleWidget');
            if (divScaleWidget && divScaleWidget.length) {
                divScaleWidget[0].style.display = 'none';
            }

            resolve();
        }
        view.addFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, resolveWhenDrawn);
        view.notifyChange();
    }));

    // For now the '--no-sandbox' flag is needed. Otherwise Chrome fails to start:
    //
    // FATAL:zygote_host_impl_linux.cc(124)] No usable sandbox! Update your kernel
    // or see
    // https://chromium.googlesource.com/chromium/src/+/master/docs/linux_suid_sandbox_development.md
    // for more information on developing with the SUID sandbox.
    // If you want to live dangerously and need an immediate workaround, you can try
    // using --no-sandbox.
    const args = [];

    if (process.env.REMOTE_DEBUGGING) {
        args.push(`--remote-debugging-port=${process.env.REMOTE_DEBUGGING}`);
    }

    global.browser = await puppeteer.launch({
        executablePath: process.env.CHROME,
        headless: !process.env.DEBUG,
        devtools: !!process.env.DEBUG,
        args,
    });

    // the page all tests will be tested in
    global.page = await browser.newPage();
});

// close browser and reset global variables
after((done) => {
    global.browser.close();
    if (global.itownsServer) {
        // stop server
        global.itownsServer.close(done);
    } else {
        done();
    }
});

// store initial position for restoration after the test
beforeEach(async () => {
    initialPosition = await page.evaluate(() => {
        let init;
        if (view instanceof itowns.GlobeView && view.controls) {
            init = {
                coord: view.controls.getLookAtCoordinate(),
                heading: view.controls.getHeading(),
                range: view.controls.getRange(),
                tilt: view.controls.getTilt(),
            };
        } else if (view instanceof itowns.PlanarView) {
            // TODO: make the controls accessible from PlanarView before doing
            // anything more here
        }

        return Promise.resolve(init);
    });
});

// reset browser state instead of closing it
afterEach(async () => {
    await page.evaluate((init) => {
        if (view instanceof itowns.GlobeView && view.controls) {
            // eslint-disable-next-line no-param-reassign
            init.coord = new itowns.Coordinates(
                init.coord.crs,
                init.coord._values[0],
                init.coord._values[1],
                init.coord._values[2],
            );
            view.controls.lookAtCoordinate(init, false);
            view.notifyChange();
        } else if (view instanceof itowns.PlanarView) {
            // TODO: make the controls accessible from PlanarView before doing
            // anything more here
        }
    }, initialPosition);
    await page.mouse.move(0, 0);
});
