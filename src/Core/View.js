// *View* holds a reference to everything needed to display GIS data
//   - layers: contains all data (geometry, images, etc) (see Layer*)
//   - update loop: manage the update cycle (see MainLoop*)
//   - scene: Three.js Scene with all objects ready to be sent to the GPU for display (see [Scene](https://threejs.org/docs/#api/scenes/Scene)).
//   - camera: a thin wrapper (see Camera*) around Three.js camera (see [Camera](https://threejs.org/docs/#api/cameras/Camera))
//   - referenceCrs: objects in the scene (camera included) positions are expressed in this CRS (must be a cartesian CRS)
//

/* global window, requestAnimationFrame */
import { Scene, EventDispatcher } from 'three';
import Camera from '../Renderer/Camera';
import MainLoop from './MainLoop';
import c3DEngine from '../Renderer/c3DEngine';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from './Layer/LayerUpdateStrategy';
import { GeometryLayer, Layer, defineLayerProperty } from './Layer/Layer';
import Scheduler from './Scheduler/Scheduler';
import Debug from '../../utils/debug/Debug';


// ### View
// Parameters:
//   - *crs:* View's referenceCrs
//   - *viewerDiv:* DOM container of View's `<canvas>`
//   - *options*:
//     - *mainLoop:* MainLoop* instance to use, otherwise a default one will be constructed.
//     - *renderer:* [WebGLRenderer](https://threejs.org/docs/#api/renderers/WebGLRenderer) instance to use,
//        otherwise a default one will be constructed. If not present, a new `<canvas>` will be created and
//        added to *viewerDiv* (mutually exclusive with mainLoop).
//     - *scene3D:* [Scene](https://threejs.org/docs/#api/scenes/Scene) instance to use, otherwise a default one will be constructed
//
// ```js
// itowns.loadGpx(url).then((gpx) => {
//      if (gpx) {
//         viewer.scene.add(gpx);
//      }
// });
//
// viewer.notifyChange(0, true);
// ```
/* TODO: */
/* - remove debug boolean, replace by if __DEBUG__ and checkboxes in debug UI */
function View(crs, viewerDiv, options = {}) {
    this.referenceCrs = crs;

    this.mainLoop = options.mainLoop || new MainLoop(new Scheduler(), new c3DEngine(viewerDiv, options.renderer));

    this.scene = options.scene3D || new Scene();
    if (!options.scene3D) {
        this.scene.autoUpdate = false;
    }

    this.camera = new Camera(
        crs,
        viewerDiv.clientWidth,
        viewerDiv.clientHeight);

    this._layers = [];

    if (__DEBUG__) {
        Debug(this, viewerDiv);
    }

    this.viewerDiv = viewerDiv;
    window.addEventListener('resize', () => {
        this.mainLoop.gfxEngine.onWindowResize();
        this.camera.resize(this.viewerDiv.clientWidth, this.viewerDiv.clientHeight);
        this.camera.update();
        this.notifyChange(0, true);
    }, false);

    this.onAfterRender = () => {};

    this._changeSources = new Set();
}

View.prototype = Object.create(EventDispatcher.prototype);
View.prototype.constructor = View;

// ### addLayer
// Add *layer* in viewer.
//
// The layer id must be unique.
//
// ```js
// // Add Color Layer
// view.addLayer({
//      type: 'color',
//      id: 'iColor',
// });
// // Add Elevation Layer
// view.addLayer({
//      type: 'elevation',
//      id: 'iElevation',
// });
// ```
View.prototype.addLayer = function addLayer(layer, parentLayer) {
    layer = _preprocessLayer(this, layer, this.mainLoop.scheduler.getProtocolProvider(layer.protocol));
    if (parentLayer) {
        parentLayer.attach(layer);
    } else {
        if (typeof (layer.update) !== 'function') {
            throw new Error('Cant add GeometryLayer: missing a update function');
        }
        if (typeof (layer.preUpdate) !== 'function') {
            throw new Error('Cant add GeometryLayer: missing a preUpdate function');
        }

        this._layers.push(layer);
    }

    return layer;
};

// ### notifyChange
// Notifies the scene it needs to be updated due to changes exterior to the
// scene itself (e.g. camera movement).
//
// Arguments:
// - *delay*: using a non-0 delay allows to delay update - useful to reduce CPU load for
// non-interactive events (e.g: texture loaded)
// - *needsRedraw*: indicate that the change introduce a visual difference, so a redraw
// of the View should be done
// - *changeSource*: who's causing the change (a tile with a new texture, a camera moving, etc)
// This knowledge can help the various update mechanism to make smarter decisions on what
// really needs to be updated.
View.prototype.notifyChange = function notifyChange(delay, needsRedraw, changeSource) {
    if (delay) {
        window.setTimeout(() => {
            this._changeSources.add(changeSource);
            this.mainLoop.scheduleViewUpdate(this, needsRedraw);
        }, delay);
    } else {
        this._changeSources.add(changeSource);
        this.mainLoop.scheduleViewUpdate(this, needsRedraw);
    }
};

// ### getLayers
// Get all layers, with an optionnal filter applied.
// The filter method will be called with 2 args:
//   - 1st: current layer
//   - 2nd: (optional) the geometry layer to which the current layer is attached
//
// ```js
// // get all color layers
// view.getLayers(layer => layer.type === 'color')
// // get one layer with id
// view.getLayers(layer => layer.id === 'itt')
// ```
View.prototype.getLayers = function getLayers(filter) {
    const result = [];
    for (const geometryLayer of this._layers) {
        if (!filter || filter(geometryLayer)) {
            result.push(geometryLayer);
        }
        for (const attached of geometryLayer._attachedLayers) {
            if (!filter || filter(attached, geometryLayer)) {
                result.push(attached);
            }
        }
    }
    return result;
};

// #### Private API


const _syncThreejsLayer = function _syncThreejsLayer(layer, view) {
    if (layer.visible) {
        view.camera.camera3D.layers.enable(layer.threejsLayer);
    } else {
        view.camera.camera3D.layers.disable(layer.threejsLayer);
    }
};

function _preprocessLayer(view, layer, provider) {
    if (!(layer instanceof Layer) && !(layer instanceof GeometryLayer)) {
        const nlayer = new Layer(layer.id);
        delete layer.id;
        layer = Object.assign(nlayer, layer);
    }

    if (!layer.updateStrategy) {
        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
        };
    }

    if (provider) {
        if (provider.tileInsideLimit) {
            layer.tileInsideLimit = provider.tileInsideLimit.bind(provider);
        }

        if (provider.tileTextureCount) {
            layer.tileTextureCount = provider.tileTextureCount.bind(provider);
        }

        if (provider.preprocessDataLayer) {
            provider.preprocessDataLayer(layer);
        }
    }

    /* probably not the best place to do this */
    if (layer.type == 'color') {
        defineLayerProperty(layer, 'frozen', false);
        defineLayerProperty(layer, 'visible', true);
        defineLayerProperty(layer, 'opacity', 1.0);
        defineLayerProperty(layer, 'sequence', 0);
    } else if (layer.type == 'elevation') {
        defineLayerProperty(layer, 'frozen', false);
    } else if (layer.type == 'geometry' || layer.type == 'debug') {
        layer.threejsLayer = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
        defineLayerProperty(layer, 'visible', true, () => _syncThreejsLayer(layer, view));
        _syncThreejsLayer(layer, view);
    }
    return layer;
}

export default View;

