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

    global.waitNextRender = page =>
        page.evaluate(() => new Promise((resolve) => {
            function getView() {
                if (typeof (view) === 'object') {
                    return Promise.resolve(view);
                }
                if (typeof (globeView) === 'object') {
                    return Promise.resolve(globeView);
                }
                resolve(false);
                return Promise.reject();
            }

            getView().then((v) => {
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
                v.notifyChange(true);
            });
        }));

    // Helper function: returns true when all layers are
    // ready and rendering has been done
    global.exampleCanRenderTest = async (page, screenshotName) => {
        const result = await page.evaluate(() => new Promise((resolve) => {
            function getView() {
                if (typeof (view) === 'object') {
                    return Promise.resolve(view);
                }
                if (typeof (globeView) === 'object') {
                    return Promise.resolve(globeView);
                }
                resolve(false);
                return Promise.reject();
            }

            getView().then((v) => {
                function resolveWhenReady() {
                    v.removeEventListener(itowns.VIEW_EVENTS.LAYERS_INITIALIZED, resolveWhenReady);
                    resolve(true);
                }
                v.addEventListener(itowns.VIEW_EVENTS.LAYERS_INITIALIZED, resolveWhenReady);
            });
        }));

        if (process.env.SCREENSHOT_FOLDER) {
            await waitNextRender(page);

            const sanitized = screenshotName.replace(/[^\w_]/g, '_');
            const file = `${process.env.SCREENSHOT_FOLDER}/${sanitized}.png`;
            await page.screenshot({ path: file });
            console.log('Wrote ', file);
        }

        return result;
    };
    global.browser = await puppeteer.launch({
        executablePath: process.env.CHROME,
        headless: !process.env.DEBUG,
        devtools: !!process.env.DEBUG,
        // For now the '--no-sandbox' flag is needed. Otherwise Chrome fails to start:
        //
        // FATAL:zygote_host_impl_linux.cc(124)] No usable sandbox! Update your kernel
        // or see
        // https://chromium.googlesource.com/chromium/src/+/master/docs/linux_suid_sandbox_development.md
        // for more information on developing with the SUID sandbox.
        // If you want to live dangerously and need an immediate workaround, you can try
        // using --no-sandbox.
        args: ['--no-sandbox'] });
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

