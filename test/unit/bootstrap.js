import fetch from 'node-fetch';
import jsdom from 'jsdom';

global.window = new jsdom.JSDOM('', {
    url: 'http://localhost',
    pretendToBeVisual: true,
}).window;
global.document = window.document;
global.requestAnimationFrame = window.requestAnimationFrame;
global.fetch = fetch;
global.fetch.Promise = Promise;
global.Event = window.Event;

// hack while waiting https://github.com/jsdom/jsdom/pull/2926 to be merged
window.SVGElement.prototype.createSVGMatrix = () => {};

// another hack, as clientWidth and clientHeight return 0 and are
// readonly in jsdom
Object.defineProperty(window.Element.prototype, 'clientWidth', { get: () => 400 });
Object.defineProperty(window.Element.prototype, 'clientHeight', { get: () => 300 });
window.Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 400, height: 300 });

// hack to set the width and height of the image, to be used for the icon of labels
Object.defineProperty(window.HTMLImageElement.prototype, 'width', { get: () => 10 });
Object.defineProperty(window.HTMLImageElement.prototype, 'height', { get: () => 10 });

class Renderer {
    constructor() {
        this.domElement = document.createElement('div');


        const parentElement = document.createElement('div');
        parentElement.appendChild(this.domElement);

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
    }

    setSize() {}
    setClearColor() {}
    getRenderTarget() {}
    setRenderTarget() {}
    clear() {}
    render() {}
    readRenderTargetPixels() { }
    getContext() { return this.context; }
    getClearAlpha() { return 1; }
}

export default Renderer;
