import Renderer from './mock';

// to add global.document
const renderer = new Renderer();
renderer.render();

global.window = {};
global.URL = function URL() {
    this.ref = undefined;
};
