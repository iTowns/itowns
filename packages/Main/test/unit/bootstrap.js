/* eslint-disable max-classes-per-file */
import { Object3D } from 'three';
import { DOMParser } from '@xmldom/xmldom';
import threads from 'worker_threads';
import 'webgl-mock';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import * as THREE from 'three';

setGlobalDispatcher(new EnvHttpProxyAgent());

const WORKER = Symbol('worker');

class Worker extends EventTarget {
    constructor(url) {
        super();

        const worker = new threads.Worker(url);
        this[WORKER] = worker;

        worker.on('message', (data) => {
            const event = new Event('message');
            event.data = data;
            this.dispatchEvent(event);
        });

        worker.on('error', () => {
            const event = new Event('error');
            this.dispatchEvent(event);
        });

        worker.on('messageerror', (data) => {
            const event = new Event('messageError');
            event.data = data;
            this.dispatchEvent(event);
        });
    }

    postMessage(data, transferList) {
        this[WORKER].postMessage(data, transferList);
    }

    terminate() {
        this[WORKER].terminate();
    }
}

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    DOMParser,
    setTimeout,
};

global.Worker = Worker;

global.requestAnimationFrame = () => {};
global.fetch = fetch;
global.fetch.Promise = Promise;

// this could be replaced by jsdom.Navigator in https://github.com/iTowns/itowns/pull/1412
// Checking if global.navigator exists targets node versions <21.1.0. Since node
// <21.1.0, global.navigator is read-only.
if (!global.navigator) {
    global.navigator = {
        userAgent: 'firefox',
    };
}

const HEADER_SIZE = 40;
const GTX_ROWS = 381;
const GTX_COLS = 421;

global.createGtxBuffer = function (elevation = 1) {
    const buffer = new ArrayBuffer(
        HEADER_SIZE + GTX_COLS * GTX_ROWS * Float32Array.BYTES_PER_ELEMENT,
    );

    const header = new DataView(buffer, 0, HEADER_SIZE);
    header.setFloat64(0, 42);
    header.setFloat64(8, -5.5);
    header.setFloat64(16, 0.025);
    header.setFloat64(24, 0.0333333333333);
    header.setInt32(32, GTX_ROWS);
    header.setInt32(36, GTX_COLS);

    const data = new DataView(buffer, 40);
    for (let i = 0; i < data.byteLength; i += Float32Array.BYTES_PER_ELEMENT) {
        data.setFloat32(i, elevation);
    }

    return buffer;
};

class DOMElement {
    constructor() {
        this.children = [];
        this.clientWidth = 400;
        this.clientHeight = 300;
        this.width = 400;
        this.height = 300;
        this.events = new Map();
        this.classList = new Set();
        this.style = {
            display: 'block',
            setProperty: (p, v) => {
                this.style[p] = v;
            },
        };
        document.documentElement = this;

        Object.defineProperty(this, 'onload', {
            set: (f) => { f(); },
        });
    }


    setAttribute(att, val) {
        this[att] = val;
    }
    focus() {}
    appendChild(c) {
        c.parentNode = this;
        this.children.push(c);
    }
    append(c) { this.appendChild(c); }
    cloneNode() { return Object.create(this); }
    getBoundingClientRect() { return { x: 0, y: 0, width: this.width, height: this.height }; }
    addEventListener(event, cb) { this.events.set(event, cb); }
    removeEventListener() {}
    emitEvent(event, params) {
        const callback = this.events.get(event);
        if (callback) {
            return callback(params);
        }
    }
    createSVGMatrix() {}
    getElementsByClassName(className) {
        return [this.children.find(element => element.class === className)];
    }
}

// Mock HTMLDivElement for Mocha
global.HTMLDivElement = DOMElement;

class HTMLImageElement extends DOMElement {
    constructor(width, height) {
        super();
        this.width = width || 10;
        this.height = height || 10;
        this.naturalWidth = this.width;
        this.naturalHeight = this.height;
        Object.defineProperty(this, 'src', {
            set: () => { this.emitEvent('load'); },
        });
    }
}

class CanvasPattern {
    setTransform(/* matrix */) { return undefined; }
}
class CanvasGradient {
    addColorStop(/* offset, color */) { return undefined; }
}

class DOMMatrix {
    scale(/* matrix */) { return [1, 1, 1, 1]; }
}

// Mock document object for Mocha.
global.document = {
    createElement: (type) => {
        if (type == 'canvas') {
            const canvas = new DOMElement();

            canvas.getContext = (contextType) => {
                if (contextType === '2d') {
                    return {
                        fillRect: () => { },
                        rect: () => { },
                        moveTo: () => { },
                        lineTo: () => { },
                        beginPath: () => { },
                        stroke: () => { },
                        fill: () => { },
                        arc: () => { },
                        setTransform: () => { },
                        setLineDash: () => { },
                        drawImage: (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
                            canvas.width = dw;
                            canvas.height = dh;

                            const image = global.document.createElement('img');
                            image.width = dw;
                            image.height = dh;
                            return image;
                        },
                        getImageData: (sx, sy, sw, sh) => {
                            const imageData = {
                                data: new Uint8ClampedArray(sw * sh * 4),
                                colorSpace: 'srgb',
                                height: sh,
                                width: sw,
                            };
                            return imageData;
                        },
                        putImageData: (imageData) => {
                            const image = global.document.createElement('img');
                            image.width = imageData.sw;
                            image.height = imageData.sh;
                            return image;
                        },
                        createPattern: (/* image, repetition */) => {
                            const canvasPattern = new CanvasPattern();
                            return canvasPattern;
                        },
                        createLinearGradient: (/* x0, y0, x1, y1 */) => {
                            const canvasGradient = new CanvasGradient();
                            return canvasGradient;
                        },
                        canvas,
                    };
                } else if (contextType === 'webgl' || contextType === 'webgl2') {
                    const gl = new WebGLRenderingContext(canvas);
                    // Force to WebGL 2.0 as this is used by THREE. Note that we should return different values depending
                    // on the parameter to retrieved but this has not been implemented yet as it is sufficient for the
                    // tests to run. See https://github.com/iTowns/itowns/pull/2376 for more information.
                    gl.getParameter = () => 'WebGL 2';
                    // Mock WebGL 2.0 methods
                    gl.texImage3D = () => {};
                    // Fix getExtension returning undefined
                    gl.getExtension = () => null;
                    return gl;
                }
            };

            canvas.toDataURL = () => ({ width: canvas.width, height: canvas.height });

            return canvas;
        } else if (type == 'img') {
            const img = new HTMLImageElement();
            return img;
        } else if (type == 'svg') {
            const svg = new DOMElement();
            svg.createSVGMatrix = () => new DOMMatrix();
            return svg;
        }

        return new DOMElement();
    },
    createElementNS: (_, type) => (global.document.createElement(type)),
    getElementsByTagName: () => [new DOMElement()],
    events: new Map(),
};

global.document.addEventListener = (event, cb) => { global.document.events.set(event, cb); };
global.document.removeEventListener = () => {};
global.document.emitEvent = (event, params) => {
    const callback = global.document.events.get(event);
    if (callback) {
        return callback(params);
    }
};
global.document.documentElement = global.document.createElement();
global.document.body = new DOMElement();

global.XRRigidTransform = class {};

class Path2D {
    moveTo() {}
    lineTo() {}
}

global.Path2D = Path2D;

class EventDispatcher {
    constructor() {
        this.events = new Map();
    }

    addEventListener(type, listener) {
        this.events.set(type, listener);
    }

    dispatchEvent(event) {
        this.events.get(event.type).call(this, event);
    }
}

class Renderer {
    constructor() {
        this.domElement = new DOMElement();
        this.domElement.parentElement = new DOMElement();
        this.domElement.parentElement.appendChild(this.domElement);

        this.xr = new EventDispatcher();
        this.xr.isPresenting = false;
        this.xr.getReferenceSpace = () => ({
            getOffsetReferenceSpace: () => {},
        });
        this.xr.setReferenceSpace = () => {};
        this.xr.getCamera = () => {
            // Create a new THREE.Object3D instance to represent the camera.
            const cameraObj = new THREE.Object3D();

            // Add a cameras property to mimic the original structure.
            cameraObj.cameras = [new THREE.PerspectiveCamera()];

            // Override getWorldPosition to copy a fixed position into the target vector.
            cameraObj.getWorldPosition = function (target) {
                target.copy(new THREE.Vector3(80, 90, 100));
            };

            // Override getWorldQuaternion to copy a fixed quaternion into the target.
            cameraObj.getWorldQuaternion = function (target) {
                target.copy(new THREE.Quaternion(0, 0, 0, 1));
            };

            return cameraObj;
        };
        this.xr.setAnimationLoop = function (callback) {
            this.animationLoopCallback = callback;
        };
        // Return a fake controller
        const _getController = () => {
            const controller = new Object3D();
            controller.gamepad = { axes: [0, 0, 0, 0], buttons: [] };
            controller.addEventListener = function (event, fn) {
                this.listeners = this.listeners || {};
                if (!this.listeners[event]) { this.listeners[event] = []; }
                this.listeners[event].push(fn);
            };
            controller.dispatchEvent = function (event) {
                if (this.listeners && this.listeners[event.type]) {
                    this.listeners[event.type].forEach(fn => fn(event));
                }
            };
            controller.gamepad = {
                axes: [0, 0, 0.5, 0],
                buttons: [
                    { pressed: true, touched: false },  // simulate a pressed button at index 0
                ],
            };
            controller.isStickActive = false;
            controller.lastButtonItem = undefined;
            controller.gamepad.endGamePadtrackEmit = undefined;
            return controller;
        };
        // Return a fake controller grip.
        const _getControllerGrip = () => new Object3D();

        // Patch getController and getControllerGrip to cache objects per index.
        const controllersCache = {};
        const gripsCache = {};

        // Patch getController because we need to keep track of each created object:
        this.xr.getController = function (i) {
            if (!controllersCache[i]) {
                controllersCache[i] = _getController();
            }
            return controllersCache[i];
        };

        // Patch getControllerGrip:
        this.xr.getControllerGrip = function (i) {
            if (!gripsCache[i]) {
                gripsCache[i] = _getControllerGrip();
            }
            return gripsCache[i];
        };

        this.xr.getSession = () => {};

        this.context = {
            getParameter: () => 16,
            createProgram: () => { },
            createShader: () => { },
            attachShader: () => { },
            linkProgram: () => { },
            getProgramParameter: () => { },
            getProgramInfoLog: () => { },
            deleteProgram: () => { },
            deleteShader: () => { },
            shaderSource: () => { },
            compileShader: () => { },
        };
        this.capabilities = {
            logarithmicDepthBuffer: true,
            isWebGL2: true,
        };
        this.debug = {};
    }

    setSize() {}
    setClearColor() {}
    getRenderTarget() {}
    setRenderTarget() {}
    clear() {}
    render() {}
    readRenderTargetPixels() { }
    getContext() { return this.context; }
}

export default Renderer;
