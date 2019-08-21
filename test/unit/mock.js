import fetch from 'node-fetch';

class Renderer {
    constructor() {
        const events = new Map();
        const addEventListener = (event, callback) => {
            events.set(event, callback);
        };
        this.domElement = {
            addEventListener,
            getBoundingClientRect: () => ({
                x: 10,
                y: 10,
            }),
            removeEventListener: () => {},
            emitEvent: (event, params) => {
                const callback = events.get(event);
                if (callback) {
                    return callback(params);
                }
            },
            focus: () => {},
        };
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
            createElement: () => ({
                addEventListener: () => {},
                getContext: () => ({
                    fillRect: () => { },
                    moveTo: () => { },
                    lineTo: () => { },
                    beginPath: () => { },
                    stroke: () => { },
                    fill: () => { },
                    arc: () => { },
                    setTransform: () => { },
                    canvas: {
                        width: 256,
                        height: 256,
                    },
                }),
            }),
            createElementNS: () => ({
                createSVGMatrix: () => { },
            }),
        };

        global.window = {
            addEventListener,
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
