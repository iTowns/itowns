**iTowns** supports **WebGL 2.0** and is enabled by default.
If you want instance instance with **WebGL 1.0** use option  **`renderer: { isWebGL2: false }`** to instance the viewer.

### Example to instance viewer in WebGL 2.0.
```js
// for GlobeView
const gView = new GlobeView(viewerDiv, placement);

// for PlanarView
const pView = new PlanarView(viewerDiv, extent);

// for View
const view = new View(crs, viewerDiv);

// is version webgl 2.0 after instance?
const isWebGL2 = view.mainLoop.gfxEngine.renderer.capabilities.isWebGL2; // true
```

### Example to instance viewer in WebGL 1.0.
```js
// for GlobeView
const gView = new GlobeView(viewerDiv, placement, {  renderer: { isWebGL2: false } });

// for PlanarView
const pView = new PlanarView(viewerDiv, extent, {  renderer: { isWebGL2: false } });

// for View
const view = new View(crs, viewerDiv, {  renderer: { isWebGL2: false } });

// is version webgl 1.0 after instance?
const isWebGL2 = view.mainLoop.gfxEngine.renderer.capabilities.isWebGL2; // false
```