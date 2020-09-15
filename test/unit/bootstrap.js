import fetch from 'node-fetch';

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
};

global.URL = function URL() {
    this.ref = undefined;
};

global.Event = () => {};
global.requestAnimationFrame = () => {};
global.fetch = fetch;
global.fetch.Promise = Promise;

// this could be replaced by jsdom.Navigator in https://github.com/iTowns/itowns/pull/1412
global.navigator = undefined;

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
            set: f => f(),
        });
    }


    setAttribute(att, val) {
        this[att] = val;
    }
    focus() {}
    appendChild(c) { this.children.push(c); }
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
                canvas,
            });

            canvas.toDataURL = () => ({ width: canvas.width, height: canvas.height });

            return canvas;
        } else if (type == 'img') {
            const img = new DOMElement();
            img.width = 10;
            img.height = 10;
            Object.defineProperty(img, 'src', {
                set: () => img.emitEvent('load'),
            });
            return img;
        }

        return new DOMElement();
    },
    createElementNS: (_, type) => (global.document.createElement(type)),
    getElementsByTagName: () => [new DOMElement()],
};

class Renderer {
    constructor() {
        this.domElement = new DOMElement();
        this.domElement.parentElement = new DOMElement();
        this.domElement.parentElement.appendChild(this.domElement);

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
