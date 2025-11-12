// Create a JSDOM window before Mocha/ESM modules are evaluated
const globalJsdom = require('global-jsdom');
const path = require('path');
const { pathToFileURL } = require('url');

const cleanup = globalJsdom();

// Load ESM bootstrap after creating JSDOM to run its polyfills on the JSDOM window/document
(async () => {
    const bootstrapPath = path.resolve(process.cwd(), 'packages/Main/test/unit/bootstrap.js');
    await import(pathToFileURL(bootstrapPath).href);
})().catch(() => {});

process.on('exit', () => { if (cleanup) cleanup(); });
