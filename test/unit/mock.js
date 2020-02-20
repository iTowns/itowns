import fetch from 'node-fetch';

class DOMElement {
    constructor() {
        this.children = [];
        this.clientWidth = 400;
        this.clientHeight = 300;
        this.width = 400;
        this.height = 300;
        this.style = {
            display: 'block',
        };
        this.events = new Map();

        this.removeEventListener = () => {};
        this.focus = () => {};
    }

    appendChild(c) { this.children.push(c); }
    cloneNode() { return Object.create(this); }
    getBoundingClientRect() { return { x: this.width, y: this.height }; }

    addEventListener(event, cb) { this.events.set(event, cb); }
    emitEvent(event, params) {
        const callback = this.events.get(event);
        if (callback) {
            return callback(params);
        }
    }
}

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
        };
        this.debug = {};
        global.fetch = fetch;
        global.fetch.Promise = Promise;

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
                            this.width = dw;
                            this.height = dh;

                            const image = new DOMElement();
                            image.width = dw;
                            image.height = dh;
                            return image;
                        },
                        canvas,
                    });

                    canvas.toDataURL = () => ({ width: this.width, height: this.height });

                    return canvas;
                } else if (type == 'img') {
                    const img = new DOMElement();
                    img.width = 10;
                    img.height = 10;
                    return img;
                }

                return new DOMElement();
            },
            createElementNS: () => ({
                createSVGMatrix: () => { },
            }),
            documentElement: this.domElement,
        };

        const events = new Map();
        global.window = {
            addEventListener: (event, cb) => { events.set(event, cb); },
        };

        global.Event = () => {};
        global.requestAnimationFrame = () => {};
    }
    setClearColor() {}
    getRenderTarget() {}
    setRenderTarget() {}
    clear() {}
    render() {}
    readRenderTargetPixels() { }
    getContext() { return this.context; }
}

export default Renderer;
