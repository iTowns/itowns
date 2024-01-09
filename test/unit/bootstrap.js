/* eslint-disable max-classes-per-file */
import fetch from 'node-fetch';
import { Camera } from 'three';

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
};

global.URL = function URL(url) {
    return {
        host: url.split('://')[1]?.split('/')[0],
        hostname: url.split('://')[1]?.split(':')[0],
        port: url.split('://')[1]?.split(':')[1],
        protocol: url.split('://')[0],
    };
};

global.Event = () => {};
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
    // eslint-disable-next-line no-unused-vars
    setTransform(matrix) { return undefined; }
}

class DOMMatrix {
    // eslint-disable-next-line no-unused-vars
    scale(matrix) { return [1, 1, 1, 1]; }
}

// Mock document object for Mocha.
global.document = {
    createElement: (type) => {
        if (type == 'canvas') {
            const canvas = new DOMElement();

            canvas.getContext = () => ({
                fillRect: () => { },
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
                // eslint-disable-next-line no-unused-vars
                putImageData: (imageData, dx, dy) => {
                    const image = global.document.createElement('img');
                    image.width = imageData.sw;
                    image.height = imageData.sh;
                    return image;
                },
                // eslint-disable-next-line no-unused-vars
                createPattern: (image, repetition) => {
                    const canvasPattern = new CanvasPattern();
                    return canvasPattern;
                },
                canvas,
            });

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

global.XRRigidTransform = () => {};

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
        this.xr.getCamera = () => new Camera();
        this.xr.setAnimationLoop = () => {};
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
