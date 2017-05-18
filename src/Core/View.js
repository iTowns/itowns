/**
 * Generated On: 2015-10-5
 * Class: Scene
 * Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
 */

/* global window, requestAnimationFrame */
import { Scene, EventDispatcher } from 'three';
import Camera from '../Renderer/Camera';
import MainLoop from './MainLoop';
import c3DEngine from '../Renderer/c3DEngine';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from './Layer/LayerUpdateStrategy';
import Scheduler from './Scheduler/Scheduler';
import Debug from '../../utils/debug/Debug';

/**
 * Constructs an Itowns Scene instance
 *
 * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
 * @param {DOMElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
 * @param {boolean} options - Optional properties. May contain:
 *    - mainLoop: {MainLoop} instance to use, otherwise a default one will be constructed
 *    - renderer: {WebGLRenderer} instance to use, otherwise a default one will be constructed. If
 *    not present, a new <canvas> will be created and added to viewerDiv (mutually exclusive with mainLoop)
 *    - scene3D: {Scene} instance to use, otherwise a default one will be constructed
 * @param {boolean} glDebug - debug gl code
 * @constructor
 */
 /* TODO:
 * - remove debug boolean, replace by if __DEBUG__ and checkboxes in debug UI
 * - Scene (and subobjects) should be instanciable several times.
 */
function View(crs, viewerDiv, options = {}) {
    this.referenceCrs = crs;

    this.mainLoop = options.mainLoop || new MainLoop(new Scheduler(), new c3DEngine(viewerDiv, options.renderer));

    this.scene = options.scene3D || new Scene();
    if (!options.scene3D) {
        this.scene.autoUpdate = false;
    }

    this.camera = new Camera(
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

function _preprocessLayer(view, layer, provider) {
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

    // probably not the best place to do this
    if (layer.type == 'color') {
        layer.frozen = layer.frozen || false;
        layer.visible = layer.visible == undefined ? true : layer.visible;
        layer.opacity = layer.opacity == undefined ? 1.0 : layer.opacity;
        layer.sequence = 0;
    } else if (layer.type == 'elevation') {
        layer.frozen = layer.frozen || false;
    }
}

View.prototype.addLayer = function addLayer(layer, parentLayer) {
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
    _preprocessLayer(this, layer, this.mainLoop.scheduler.getProtocolProvider(layer.protocol));
};

/**
 * Notifies the scene it needs to be updated due to changes exterior to the
 * scene itself (e.g. camera movement).
 * Using a non-0 delay allows to delay update - useful to reduce CPU load for
 * non-interactive events (e.g: texture loaded)
 * needsRedraw param indicates if notified change requires a full scene redraw.
 */
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

/*
 * Get all layers, with an optionnal filter applied.
 * The filter method will be called with 2 args:
 *   - 1st: current layer
 *   - 2nd: (optional) the geometry layer to which the current layer is attached
 */
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

export default View;
