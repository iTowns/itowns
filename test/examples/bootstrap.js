/* global process, Promise */
// eslint-disable-next-line import/no-extraneous-dependencies
const puppeteer = require('puppeteer');
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

    global.printLogs = (page) => {
        page.on('console', (msg) => {
            for (let i = 0; i < msg.args().length; ++i) {
                console.log(`${msg.args()[i]}`);
            }
        });
    };

    // Helper function: returns true when all layers are
    // ready and rendering has been done
    global.loadExample = async (page, url, screenshotName) => {
        if (page.loadExampleCalled) {
            throw new Error('loadExample must only be called once. Use waitUntilItownsIsIdle / waitNextRender instead');
        }
        // eslint-disable-next-line no-param-reassign
        page.loadExampleCalled = true;
        page.setViewport({ width: 400, height: 300 });

        await page.goto(url);
        await page.waitFor('#viewerDiv > canvas');

        // install a globally available __getView helper
        await page.evaluate(() => {
            window.__getView = function _() {
                if (typeof (view) === 'object') {
                    return Promise.resolve(view);
                }
                if (typeof (globeView) === 'object') {
                    return Promise.resolve(globeView);
                }
                resolve(false);
                return Promise.reject();
            };
        });

        const result = await page.evaluate(() => new Promise((resolve) => {
            __getView().then((v) => {
                function resolveWhenReady() {
                    v.removeEventListener(itowns.VIEW_EVENTS.LAYERS_INITIALIZED, resolveWhenReady);
                    resolve(true);
                }
                v.addEventListener(itowns.VIEW_EVENTS.LAYERS_INITIALIZED, resolveWhenReady);
            });
        }));

        await waitNextRender(page);

        await saveScreenshot(page, screenshotName);

        return result;
    };

    // Use waitUntilItownsIsIdle to wait until itowns has finished all its work (= layer updates)
    global.waitUntilItownsIsIdle = async (page, screenshotName) => {
        const result = await page.evaluate(() => new Promise((resolve) => {
            __getView().then((v) => {
                function resolveWhenReady() {
                    if (v.mainLoop.renderingState === 0) {
                        v.mainLoop.removeEventListener('command-queue-empty', resolveWhenReady);
                        resolve(true);
                    }
                }
                v.mainLoop.addEventListener('command-queue-empty', resolveWhenReady);
            });
        }));

        await waitNextRender(page);

        await saveScreenshot(page, screenshotName);

        return result;
    };

    global.waitNextRender = page =>
        page.evaluate(() => new Promise((resolve) => {
            __getView().then((v) => {
                function resolveWhenDrawn() {
                    v.removeFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, resolveWhenDrawn);

                    // make sure the loading screen is hidden
                    const container = document.getElementById('itowns-loader');
                    if (container) {
                        container.style.display = 'none';
                    }
                    resolve();
                }
                v.addFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, resolveWhenDrawn);
                v.notifyChange();
            });
        }));

    // For now the '--no-sandbox' flag is needed. Otherwise Chrome fails to start:
    //
    // FATAL:zygote_host_impl_linux.cc(124)] No usable sandbox! Update your kernel
    // or see
    // https://chromium.googlesource.com/chromium/src/+/master/docs/linux_suid_sandbox_development.md
    // for more information on developing with the SUID sandbox.
    // If you want to live dangerously and need an immediate workaround, you can try
    // using --no-sandbox.
    const args = ['--no-sandbox'];

    if (process.env.REMOTE_DEBUGGING) {
        args.push(`--remote-debugging-port=${process.env.REMOTE_DEBUGGING}`);
    }

    global.browser = await puppeteer.launch({
        executablePath: process.env.CHROME,
        headless: !process.env.DEBUG,
        devtools: !!process.env.DEBUG,
        args });
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

