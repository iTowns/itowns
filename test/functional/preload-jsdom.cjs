// Create a JSDOM window before Mocha/ESM modules are evaluated
const globalJsdom = require('global-jsdom');
const path = require('path');
const { pathToFileURL } = require('url');

const cleanup = globalJsdom();

// mock document.createElementNS(...).createSVGMatrix
const window = $jsdom.window;
const document = window.document;
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
function fakeCreateElementNS() {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(svg.outerHTML, 'image/svg+xml');
    const el = doc.documentElement;
    el.createSVGMatrix = () => {};
    return el;
}
document.createElementNS = fakeCreateElementNS;

// Load ESM bootstrap after creating JSDOM to run its polyfills on the JSDOM window/document
(async () => {
    const bootstrapPath = path.resolve(process.cwd(), 'packages/Main/test/unit/bootstrap.js');
    await import(pathToFileURL(bootstrapPath).href);
})().catch(() => {});

process.on('exit', () => { if (cleanup) cleanup(); });
