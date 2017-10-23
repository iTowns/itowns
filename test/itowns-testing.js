const fs = require('fs');
const url = require('url');
const assert = require('assert');

global.proj4 = require('proj4');
global.THREE = require('three');

const counters = {
    redraw: 0,
    fetch: [],
    visible_at_level: [],
    displayed_at_level: [],
};

const width = 800;
const height = 600;


global.TextDecoder = require('string_decoder').StringDecoder;

// Mock missing globals
global.fetch = function _fetch(url) {
    var res;
    var pr = new Promise((resolve) => {
        res = resolve;
    });

    // try reading as a file
    fs.readFile(`${process.env.PWD}/examples/${url}`, 'utf-8', (err, content) => {
        if (!content || err) {
            counters.fetch.push(url);
        }
        res({
            buffer: () => Promise.resolve(content || {}),
            json: () => Promise.resolve(JSON.parse(content)),
            arrayBuffer: () => Promise.resolve(content || {}),
            ok: true,
        });
    });
    return pr;
};

global.URL = function URL(str) {
    return url.parse(str);
};
global.document = new function _d() {
    this.createElement = () => ({});

    this.createElementNS = (foo, type) => {
        var r = {};
        r.style = {};

        if (type == 'img') {
            r.addEventListener = (evt, fn) => {
                if (evt == 'load') {
                    r.loadListener = fn;
                }
            };

            var src;
            Object.defineProperty(
                r,
                'src', {
                    get: () => src,
                    set: (u) => {
                        src = u;
                        fetch(u).then(resp => resp.buffer()).then(() => {
                            if (r.loadListener) {
                                r.loadListener({ width: 256, height: 256 });
                            }
                        });
                    },
                });
        }

        return r;
    };

    this.getElementById = () => ({
        addEventListener() {},
        dispatchEvent() { },
        appendChild() {},
        clientWidth: width,
        clientHeight: height,
        devicePixelRatio: 1.0,
    });
}();
global.window = {
    addEventListener() {},
    setTimeout,
};
global.Event = Object;
global.__DEBUG__ = false;

let testStarted = false;
let firstCallback;
global.requestAnimationFrame = (cb) => {
    if (testStarted) {
        setTimeout(cb, 1);
    } else {
        if (firstCallback) {
            throw new Error('Multiple calls to requestAnimationFrame!');
        }
        firstCallback = cb;
    }
};

// Fix: process.env.PWD is undefined for Windows
if (!process.env.PWD) {
    process.env.PWD = process.cwd();
}
// eslint-disable-next-line import/no-dynamic-require
const itowns = require(`${process.env.PWD}/lib/Main.js`);

global.renderer = {
    context: {
        getParameter(foo) {
            return foo;
        },
        getExtension() {
            return null;
        },
        MAX_TEXTURE_IMAGE_UNITS: 8,
    },
    capabilities: {
        logarithmicDepthBuffer: true,
    },
    setClearColor: () => {},
    getClearAlpha: () => {},
    setViewport: () => {},
    clear: () => {},
    clearTarget: () => {},
    render: () => { counters.redraw++; },
    domElement: document.getElementById(),
    getRenderTarget: () => 0,
    setRenderTarget: () => {},
    readRenderTargetPixels: (b, x, y, w, h, out) => {
        out.fill(0);
    },
    setScissor: () => {},
    setScissorTest: () => {},
};

global.itowns = itowns;
global.assert = assert;

exports.countVisibleAndDisplayed = (node) => {
    if (node.material) {
        if (node.visible) {
            while (counters.visible_at_level.length <= node.level) {
                counters.visible_at_level.push(0);
            }
            counters.visible_at_level[node.level]++;

            if (node.material.visible) {
                while (counters.displayed_at_level.length <= node.level) {
                    counters.displayed_at_level.push(0);
                }
                counters.displayed_at_level[node.level] ++;
            }
            for (var n of node.children) {
                exports.countVisibleAndDisplayed(n);
            }
        }
    }
};

exports.counters = counters;
exports.runTest = () => {
    testStarted = true;
    requestAnimationFrame(firstCallback);
};
global.performance = undefined;
